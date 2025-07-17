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

// Tax Categories table for managing GST rates
export const taxCategories = pgTable('tax_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  rate: decimal('rate', { precision: 5, scale: 2 }).notNull(),
  hsnCodeRange: text('hsn_code_range'),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Tax Settings table for global tax configuration
export const taxSettings = pgTable('tax_settings', {
  id: serial('id').primaryKey(),
  taxCalculationMethod: text('tax_calculation_method').default('afterDiscount'), // afterDiscount, beforeDiscount
  pricesIncludeTax: boolean('prices_include_tax').default(false),
  enableMultipleTaxRates: boolean('enable_multiple_tax_rates').default(true),
  companyGstin: text('company_gstin'),
  companyState: text('company_state'),
  companyStateCode: text('company_state_code'),
  defaultTaxCategoryId: integer('default_tax_category_id').references(() => taxCategories.id),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// HSN Code Master table for tax rate mapping
export const hsnCodes = pgTable('hsn_codes', {
  id: serial('id').primaryKey(),
  hsnCode: text('hsn_code').notNull().unique(),
  description: text('description').notNull(),
  taxCategoryId: integer('tax_category_id').references(() => taxCategories.id).notNull(),
  cgstRate: decimal('cgst_rate', { precision: 5, scale: 2 }).default('0'),
  sgstRate: decimal('sgst_rate', { precision: 5, scale: 2 }).default('0'),
  igstRate: decimal('igst_rate', { precision: 5, scale: 2 }).default('0'),
  cessRate: decimal('cess_rate', { precision: 5, scale: 2 }).default('0'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
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
  mrp: decimal('mrp', { precision: 10, scale: 2 }).default('0'),
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

// Label templates table for customizable label printing
export const labelTemplates = pgTable('label_templates', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  width: decimal('width', { precision: 6, scale: 2 }).notNull(), // in mm
  height: decimal('height', { precision: 6, scale: 2 }).notNull(), // in mm
  fontSize: integer('font_size').notNull().default(12),
  productNameFontSize: integer('product_name_font_size').default(18),
  includeBarcode: boolean('include_barcode').default(true),
  includePrice: boolean('include_price').default(true),
  includeDescription: boolean('include_description').default(false),
  includeMRP: boolean('include_mrp').default(true),
  includeWeight: boolean('include_weight').default(false),
  includeHSN: boolean('include_hsn').default(false),
  includeManufacturingDate: boolean('include_manufacturing_date').default(false),
  includeExpiryDate: boolean('include_expiry_date').default(false),
  barcodePosition: text('barcode_position').default('bottom'), // top, bottom, left, right
  borderStyle: text('border_style').default('solid'), // solid, dashed, dotted, none
  borderWidth: integer('border_width').default(1),
  backgroundColor: text('background_color').default('#ffffff'),
  textColor: text('text_color').default('#000000'),
  customCSS: text('custom_css'),
  storeTitle: text('store_title'), // Store name/header like "M MART"
  isDefault: boolean('is_default').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Print jobs table for tracking label printing history
export const printJobs = pgTable('print_jobs', {
  id: serial('id').primaryKey(),
  templateId: integer('template_id').references(() => labelTemplates.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  productIds: text('product_ids').notNull(), // JSON array of product IDs
  copies: integer('copies').notNull().default(1),
  labelsPerRow: integer('labels_per_row').notNull().default(2),
  paperSize: text('paper_size').default('A4'),
  orientation: text('orientation').default('portrait'),
  status: text('status').default('completed'), // pending, printing, completed, failed
  totalLabels: integer('total_labels').notNull(),
  customText: text('custom_text'),
  printSettings: text('print_settings'), // JSON for additional settings
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Manufacturing Orders table for production planning
export const manufacturingOrders = pgTable('manufacturing_orders', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  productId: integer('product_id').references(() => products.id).notNull(),
  targetQuantity: integer('target_quantity').notNull(),
  currentQuantity: integer('current_quantity').default(0),
  rawMaterialsUsed: text('raw_materials_used'), // JSON array of materials
  batchNumber: text('batch_number').notNull(),
  manufacturingDate: timestamp('manufacturing_date').notNull(),
  expiryDate: timestamp('expiry_date'),
  qualityCheckStatus: text('quality_check_status').default('pending'), // pending, passed, failed
  status: text('status').default('planned'), // planned, in_progress, completed, cancelled
  priority: text('priority').default('medium'), // low, medium, high, urgent
  estimatedCost: decimal('estimated_cost', { precision: 10, scale: 2 }),
  actualCost: decimal('actual_cost', { precision: 10, scale: 2 }),
  notes: text('notes'),
  assignedUserId: integer('assigned_user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Manufacturing Batches table for tracking production batches
export const manufacturingBatches = pgTable('manufacturing_batches', {
  id: serial('id').primaryKey(),
  batchNumber: text('batch_number').notNull().unique(),
  productId: integer('product_id').references(() => products.id).notNull(),
  manufacturingOrderId: integer('manufacturing_order_id').references(() => manufacturingOrders.id),
  quantity: integer('quantity').notNull(),
  manufacturingDate: timestamp('manufacturing_date').notNull(),
  expiryDate: timestamp('expiry_date'),
  costPerUnit: decimal('cost_per_unit', { precision: 10, scale: 2 }),
  totalCost: decimal('total_cost', { precision: 10, scale: 2 }),
  qualityGrade: text('quality_grade').default('A'), // A, B, C, Reject
  storageLocation: text('storage_location'),
  status: text('status').default('active'), // active, consumed, expired, damaged
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Quality Control Checks table
export const qualityControlChecks = pgTable('quality_control_checks', {
  id: serial('id').primaryKey(),
  manufacturingOrderId: integer('manufacturing_order_id').references(() => manufacturingOrders.id),
  batchId: integer('batch_id').references(() => manufacturingBatches.id),
  checkType: text('check_type').notNull(), // visual, weight, packaging, contamination
  checkDate: timestamp('check_date').defaultNow().notNull(),
  checkResult: text('check_result').notNull(), // pass, fail, conditional_pass
  inspectorUserId: integer('inspector_user_id').references(() => users.id).notNull(),
  notes: text('notes'),
  correctiveAction: text('corrective_action'),
  reCheckRequired: boolean('re_check_required').default(false),
  reCheckDate: timestamp('re_check_date'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Raw Materials table for manufacturing inputs
export const rawMaterials = pgTable('raw_materials', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  unit: text('unit').notNull(), // kg, g, liters, pieces
  currentStock: decimal('current_stock', { precision: 10, scale: 3 }).default('0'),
  minStockLevel: decimal('min_stock_level', { precision: 10, scale: 3 }).default('0'),
  unitCost: decimal('unit_cost', { precision: 10, scale: 2 }).notNull(),
  supplierId: integer('supplier_id').references(() => suppliers.id),
  storageLocation: text('storage_location'),
  expiryTracking: boolean('expiry_tracking').default(false),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Manufacturing Recipes table (BOM - Bill of Materials)
export const manufacturingRecipes = pgTable('manufacturing_recipes', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  outputQuantity: integer('output_quantity').notNull().default(1),
  estimatedTime: integer('estimated_time_minutes'),
  instructions: text('instructions'),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Recipe Ingredients table (BOM items)
export const recipeIngredients = pgTable('recipe_ingredients', {
  id: serial('id').primaryKey(),
  recipeId: integer('recipe_id').references(() => manufacturingRecipes.id).notNull(),
  rawMaterialId: integer('raw_material_id').references(() => rawMaterials.id).notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 3 }).notNull(),
  unit: text('unit').notNull(),
  wastagePercentage: decimal('wastage_percentage', { precision: 5, scale: 2 }).default('0'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Bill of Materials (BOM) table - Main BOM definitions
export const billOfMaterials = pgTable('bill_of_materials', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  version: text('version').default('1.0'),
  outputQuantity: integer('output_quantity').notNull().default(1),
  outputUnit: text('output_unit').notNull().default('units'),
  totalCost: decimal('total_cost', { precision: 10, scale: 2 }).default('0'),
  estimatedTimeMinutes: integer('estimated_time_minutes'),
  instructions: text('instructions'),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// BOM Items table - Individual components/materials in a BOM
export const bomItems = pgTable('bom_items', {
  id: serial('id').primaryKey(),
  bomId: integer('bom_id').references(() => billOfMaterials.id).notNull(),
  materialId: integer('material_id').references(() => products.id).notNull(), // Can reference products as materials
  quantity: decimal('quantity', { precision: 10, scale: 3 }).notNull(),
  unit: text('unit').notNull(),
  unitCost: decimal('unit_cost', { precision: 10, scale: 2 }).notNull(),
  totalCost: decimal('total_cost', { precision: 10, scale: 2 }).notNull(),
  wastagePercentage: decimal('wastage_percentage', { precision: 5, scale: 2 }).default('0'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Production Orders table - Actual production based on BOM
export const productionOrders = pgTable('production_orders', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  bomId: integer('bom_id').references(() => billOfMaterials.id).notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  targetQuantity: integer('target_quantity').notNull(),
  producedQuantity: integer('produced_quantity').default(0),
  status: text('status').default('pending'), // pending, in_progress, completed, cancelled
  priority: text('priority').default('medium'), // low, medium, high, urgent
  scheduledDate: timestamp('scheduled_date'),
  startedDate: timestamp('started_date'),
  completedDate: timestamp('completed_date'),
  estimatedCost: decimal('estimated_cost', { precision: 10, scale: 2 }),
  actualCost: decimal('actual_cost', { precision: 10, scale: 2 }),
  notes: text('notes'),
  assignedUserId: integer('assigned_user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Production Order Items table - Materials consumed in production
export const productionOrderItems = pgTable('production_order_items', {
  id: serial('id').primaryKey(),
  productionOrderId: integer('production_order_id').references(() => productionOrders.id).notNull(),
  materialId: integer('material_id').references(() => products.id).notNull(),
  plannedQuantity: decimal('planned_quantity', { precision: 10, scale: 3 }).notNull(),
  actualQuantity: decimal('actual_quantity', { precision: 10, scale: 3 }).default('0'),
  unit: text('unit').notNull(),
  unitCost: decimal('unit_cost', { precision: 10, scale: 2 }).notNull(),
  totalCost: decimal('total_cost', { precision: 10, scale: 2 }).notNull(),
  wastageQuantity: decimal('wastage_quantity', { precision: 10, scale: 3 }).default('0'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Waste/Damage Records table - Track waste and damage during production
export const wasteRecords = pgTable('waste_records', {
  id: serial('id').primaryKey(),
  productionOrderId: integer('production_order_id').references(() => productionOrders.id),
  materialId: integer('material_id').references(() => products.id),
  wasteType: text('waste_type').notNull(), // material_waste, production_damage, expired, contaminated
  quantity: decimal('quantity', { precision: 10, scale: 3 }).notNull(),
  unit: text('unit').notNull(),
  unitCost: decimal('unit_cost', { precision: 10, scale: 2 }).notNull(),
  totalCost: decimal('total_cost', { precision: 10, scale: 2 }).notNull(),
  reason: text('reason'),
  notes: text('notes'),
  recordedBy: integer('recorded_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Type definitions for BOM
export type BillOfMaterial = typeof billOfMaterials.$inferSelect;
export type BillOfMaterialInsert = typeof billOfMaterials.$inferInsert;
export type BomItem = typeof bomItems.$inferSelect;
export type BomItemInsert = typeof bomItems.$inferInsert;
export type ProductionOrder = typeof productionOrders.$inferSelect;
export type ProductionOrderInsert = typeof productionOrders.$inferInsert;
export type ProductionOrderItem = typeof productionOrderItems.$inferSelect;
export type ProductionOrderItemInsert = typeof productionOrderItems.$inferInsert;
export type WasteRecord = typeof wasteRecords.$inferSelect;
export type WasteRecordInsert = typeof wasteRecords.$inferInsert;

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

// Manufacturing Relations
export const manufacturingOrdersRelations = relations(manufacturingOrders, ({ one, many }) => ({
  product: one(products, { fields: [manufacturingOrders.productId], references: [products.id] }),
  assignedUser: one(users, { fields: [manufacturingOrders.assignedUserId], references: [users.id] }),
  batches: many(manufacturingBatches),
  qualityChecks: many(qualityControlChecks)
}));

export const manufacturingBatchesRelations = relations(manufacturingBatches, ({ one }) => ({
  product: one(products, { fields: [manufacturingBatches.productId], references: [products.id] }),
  manufacturingOrder: one(manufacturingOrders, { fields: [manufacturingBatches.manufacturingOrderId], references: [manufacturingOrders.id] })
}));

export const qualityControlChecksRelations = relations(qualityControlChecks, ({ one }) => ({
  manufacturingOrder: one(manufacturingOrders, { fields: [qualityControlChecks.manufacturingOrderId], references: [manufacturingOrders.id] }),
  batch: one(manufacturingBatches, { fields: [qualityControlChecks.batchId], references: [manufacturingBatches.id] }),
  inspector: one(users, { fields: [qualityControlChecks.inspectorUserId], references: [users.id] })
}));

export const rawMaterialsRelations = relations(rawMaterials, ({ one, many }) => ({
  supplier: one(suppliers, { fields: [rawMaterials.supplierId], references: [suppliers.id] }),
  recipeIngredients: many(recipeIngredients)
}));

export const manufacturingRecipesRelations = relations(manufacturingRecipes, ({ one, many }) => ({
  product: one(products, { fields: [manufacturingRecipes.productId], references: [products.id] }),
  ingredients: many(recipeIngredients)
}));

export const recipeIngredientsRelations = relations(recipeIngredients, ({ one }) => ({
  recipe: one(manufacturingRecipes, { fields: [recipeIngredients.recipeId], references: [manufacturingRecipes.id] }),
  rawMaterial: one(rawMaterials, { fields: [recipeIngredients.rawMaterialId], references: [rawMaterials.id] })
}));

// Tax Categories relations
export const taxCategoriesRelations = relations(taxCategories, ({ many }) => ({
  hsnCodes: many(hsnCodes)
}));

// HSN Codes relations
export const hsnCodesRelations = relations(hsnCodes, ({ one }) => ({
  taxCategory: one(taxCategories, { fields: [hsnCodes.taxCategoryId], references: [taxCategories.id] })
}));

// Tax Settings relations
export const taxSettingsRelations = relations(taxSettings, ({ one }) => ({
  defaultTaxCategory: one(taxCategories, { fields: [taxSettings.defaultTaxCategoryId], references: [taxCategories.id] })
}));

// Label Templates relations
export const labelTemplatesRelations = relations(labelTemplates, ({ many }) => ({
  printJobs: many(printJobs)
}));

// Print Jobs relations
export const printJobsRelations = relations(printJobs, ({ one }) => ({
  template: one(labelTemplates, { fields: [printJobs.templateId], references: [labelTemplates.id] }),
  user: one(users, { fields: [printJobs.userId], references: [users.id] })
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

// Tax Categories validation schemas
export const taxCategoryInsertSchema = createInsertSchema(taxCategories, {
  name: (schema) => schema.min(2, "Name must be at least 2 characters"),
  rate: (schema) => z.union([z.string(), z.number()]).transform(val => val.toString()),
  hsnCodeRange: (schema) => schema.optional(),
  description: (schema) => schema.optional(),
  isActive: (schema) => schema.optional()
});
export type TaxCategoryInsert = z.infer<typeof taxCategoryInsertSchema>;
export const taxCategorySelectSchema = createSelectSchema(taxCategories);
export type TaxCategory = z.infer<typeof taxCategorySelectSchema>;

// Tax Settings validation schemas
export const taxSettingsInsertSchema = createInsertSchema(taxSettings, {
  taxCalculationMethod: (schema) => schema.optional(),
  pricesIncludeTax: (schema) => schema.optional(),
  enableMultipleTaxRates: (schema) => schema.optional(),
  companyGstin: (schema) => schema.optional(),
  companyState: (schema) => schema.optional(),
  companyStateCode: (schema) => schema.optional(),
  defaultTaxCategoryId: (schema) => schema.optional()
});
export type TaxSettingsInsert = z.infer<typeof taxSettingsInsertSchema>;
export const taxSettingsSelectSchema = createSelectSchema(taxSettings);
export type TaxSettingsType = z.infer<typeof taxSettingsSelectSchema>;

// HSN Codes validation schemas
export const hsnCodeInsertSchema = createInsertSchema(hsnCodes, {
  hsnCode: (schema) => schema.min(4, "HSN code must be at least 4 characters"),
  description: (schema) => schema.min(3, "Description must be at least 3 characters"),
  cgstRate: (schema) => z.union([z.string(), z.number()]).transform(val => val.toString()).optional(),
  sgstRate: (schema) => z.union([z.string(), z.number()]).transform(val => val.toString()).optional(),
  igstRate: (schema) => z.union([z.string(), z.number()]).transform(val => val.toString()).optional(),
  cessRate: (schema) => z.union([z.string(), z.number()]).transform(val => val.toString()).optional(),
  isActive: (schema) => schema.optional()
});
export type HsnCodeInsert = z.infer<typeof hsnCodeInsertSchema>;
export const hsnCodeSelectSchema = createSelectSchema(hsnCodes);
export type HsnCode = z.infer<typeof hsnCodeSelectSchema>;

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

// Manufacturing validation schemas
export const manufacturingOrderInsertSchema = createInsertSchema(manufacturingOrders, {
  orderNumber: (schema) => schema.min(3, "Order number must be at least 3 characters"),
  targetQuantity: (schema) => schema.min(1, "Target quantity must be at least 1"),
  currentQuantity: (schema) => schema.optional(),
  batchNumber: (schema) => schema.min(3, "Batch number must be at least 3 characters"),
  estimatedCost: (schema) => z.union([z.string(), z.number()]).transform(val => val.toString()).optional(),
  actualCost: (schema) => z.union([z.string(), z.number()]).transform(val => val.toString()).optional(),
  status: (schema) => schema.optional(),
  priority: (schema) => schema.optional(),
  notes: (schema) => schema.optional(),
  assignedUserId: (schema) => schema.optional()
});
export type ManufacturingOrderInsert = z.infer<typeof manufacturingOrderInsertSchema>;
export const manufacturingOrderSelectSchema = createSelectSchema(manufacturingOrders);
export type ManufacturingOrder = z.infer<typeof manufacturingOrderSelectSchema>;

export const manufacturingBatchInsertSchema = createInsertSchema(manufacturingBatches, {
  batchNumber: (schema) => schema.min(3, "Batch number must be at least 3 characters"),
  quantity: (schema) => schema.min(1, "Quantity must be at least 1"),
  costPerUnit: (schema) => z.union([z.string(), z.number()]).transform(val => val.toString()).optional(),
  totalCost: (schema) => z.union([z.string(), z.number()]).transform(val => val.toString()).optional(),
  qualityGrade: (schema) => schema.optional(),
  storageLocation: (schema) => schema.optional(),
  status: (schema) => schema.optional(),
  manufacturingOrderId: (schema) => schema.optional()
});
export type ManufacturingBatchInsert = z.infer<typeof manufacturingBatchInsertSchema>;
export const manufacturingBatchSelectSchema = createSelectSchema(manufacturingBatches);
export type ManufacturingBatch = z.infer<typeof manufacturingBatchSelectSchema>;

export const qualityControlCheckInsertSchema = createInsertSchema(qualityControlChecks, {
  checkType: (schema) => schema.min(3, "Check type must be at least 3 characters"),
  checkResult: (schema) => schema.min(3, "Check result must be at least 3 characters"),
  notes: (schema) => schema.optional(),
  correctiveAction: (schema) => schema.optional(),
  reCheckRequired: (schema) => schema.optional(),
  manufacturingOrderId: (schema) => schema.optional(),
  batchId: (schema) => schema.optional()
});
export type QualityControlCheckInsert = z.infer<typeof qualityControlCheckInsertSchema>;
export const qualityControlCheckSelectSchema = createSelectSchema(qualityControlChecks);
export type QualityControlCheck = z.infer<typeof qualityControlCheckSelectSchema>;

export const rawMaterialInsertSchema = createInsertSchema(rawMaterials, {
  name: (schema) => schema.min(2, "Name must be at least 2 characters"),
  description: (schema) => schema.optional(),
  unit: (schema) => schema.min(1, "Unit must be at least 1 character"),
  currentStock: (schema) => z.union([z.string(), z.number()]).transform(val => val.toString()).optional(),
  minStockLevel: (schema) => z.union([z.string(), z.number()]).transform(val => val.toString()).optional(),
  unitCost: (schema) => z.union([z.string(), z.number()]).transform(val => val.toString()),
  supplierId: (schema) => schema.optional(),
  storageLocation: (schema) => schema.optional(),
  expiryTracking: (schema) => schema.optional(),
  active: (schema) => schema.optional()
});
export type RawMaterialInsert = z.infer<typeof rawMaterialInsertSchema>;
export const rawMaterialSelectSchema = createSelectSchema(rawMaterials);
export type RawMaterial = z.infer<typeof rawMaterialSelectSchema>;

export const manufacturingRecipeInsertSchema = createInsertSchema(manufacturingRecipes, {
  name: (schema) => schema.min(2, "Name must be at least 2 characters"),
  description: (schema) => schema.optional(),
  outputQuantity: (schema) => schema.min(1, "Output quantity must be at least 1"),
  estimatedTime: (schema) => schema.optional(),
  instructions: (schema) => schema.optional(),
  active: (schema) => schema.optional()
});
export type ManufacturingRecipeInsert = z.infer<typeof manufacturingRecipeInsertSchema>;
export const manufacturingRecipeSelectSchema = createSelectSchema(manufacturingRecipes);
export type ManufacturingRecipe = z.infer<typeof manufacturingRecipeSelectSchema>;

export const recipeIngredientInsertSchema = createInsertSchema(recipeIngredients, {
  quantity: (schema) => z.union([z.string(), z.number()]).transform(val => val.toString()),
  unit: (schema) => schema.min(1, "Unit must be at least 1 character"),
  wastagePercentage: (schema) => z.union([z.string(), z.number()]).transform(val => val.toString()).optional(),
  notes: (schema) => schema.optional()
});
export type RecipeIngredientInsert = z.infer<typeof recipeIngredientInsertSchema>;
export const recipeIngredientSelectSchema = createSelectSchema(recipeIngredients);
export type RecipeIngredient = z.infer<typeof recipeIngredientSelectSchema>;

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



// Printer Settings table for managing Endura and other printers
export const printerSettings = pgTable('printer_settings', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  printerType: text('printer_type').default('endura'), // endura, thermal, laser, inkjet
  connectionType: text('connection_type').default('usb'), // usb, network, bluetooth, serial
  ipAddress: text('ip_address'),
  port: integer('port'),
  devicePath: text('device_path'), // for USB/Serial connections
  paperWidth: integer('paper_width').default(80), // in mm
  paperHeight: integer('paper_height').default(40), // in mm
  printDensity: integer('print_density').default(8), // 1-15 for thermal printers
  printSpeed: integer('print_speed').default(4), // 1-14 for thermal printers
  isDefault: boolean('is_default').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});



// Label Design Elements table for drag-drop designer
export const labelElements = pgTable('label_elements', {
  id: serial('id').primaryKey(),
  templateId: integer('template_id').references(() => labelTemplates.id).notNull(),
  elementType: text('element_type').notNull(), // text, barcode, image, line, box
  fieldName: text('field_name'), // product_name, price, barcode, etc.
  positionX: integer('position_x').default(0),
  positionY: integer('position_y').default(0),
  width: integer('width').default(100),
  height: integer('height').default(20),
  fontSize: integer('font_size').default(12),
  fontWeight: text('font_weight').default('normal'),
  textAlign: text('text_align').default('left'),
  color: text('color').default('#000000'),
  backgroundColor: text('background_color'),
  borderWidth: integer('border_width').default(0),
  borderColor: text('border_color').default('#000000'),
  rotation: integer('rotation').default(0),
  zIndex: integer('z_index').default(1),
  customProperties: text('custom_properties'), // JSON for element-specific properties
  isVisible: boolean('is_visible').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull()
});





// Label Elements validation schemas
export const labelElementInsertSchema = createInsertSchema(labelElements, {
  elementType: (schema) => schema.min(2, "Element type must be specified"),
  fieldName: (schema) => schema.optional(),
  positionX: (schema) => schema.min(0, "X position must be at least 0").optional(),
  positionY: (schema) => schema.min(0, "Y position must be at least 0").optional(),
  width: (schema) => schema.min(1, "Width must be at least 1").optional(),
  height: (schema) => schema.min(1, "Height must be at least 1").optional(),
  fontSize: (schema) => schema.min(6, "Font size must be at least 6").max(72, "Font size cannot exceed 72").optional(),
  fontWeight: (schema) => schema.optional(),
  textAlign: (schema) => schema.optional(),
  color: (schema) => schema.optional(),
  backgroundColor: (schema) => schema.optional(),
  borderWidth: (schema) => schema.min(0, "Border width must be at least 0").optional(),
  borderColor: (schema) => schema.optional(),
  rotation: (schema) => schema.min(-360, "Rotation must be at least -360").max(360, "Rotation cannot exceed 360").optional(),
  zIndex: (schema) => schema.min(1, "Z-index must be at least 1").optional(),
  customProperties: (schema) => schema.optional(),
  isVisible: (schema) => schema.optional()
});
export type LabelElementInsert = z.infer<typeof labelElementInsertSchema>;
export const labelElementSelectSchema = createSelectSchema(labelElements);
export type LabelElement = z.infer<typeof labelElementSelectSchema>;

// Label Templates validation schemas
export const labelTemplateInsertSchema = createInsertSchema(labelTemplates, {
  name: (schema) => schema.min(2, "Name must be at least 2 characters"),
  description: (schema) => schema.optional(),
  width: (schema) => z.union([z.string(), z.number()]).transform(val => val.toString()),
  height: (schema) => z.union([z.string(), z.number()]).transform(val => val.toString()),
  fontSize: (schema) => schema.optional(),
  productNameFontSize: (schema) => schema.optional(),
  includeBarcode: (schema) => schema.optional(),
  includePrice: (schema) => schema.optional(),
  includeDescription: (schema) => schema.optional(),
  includeMRP: (schema) => schema.optional(),
  includeWeight: (schema) => schema.optional(),
  includeHSN: (schema) => schema.optional(),
  includeManufacturingDate: (schema) => schema.optional(),
  includeExpiryDate: (schema) => schema.optional(),
  barcodePosition: (schema) => schema.optional(),
  borderStyle: (schema) => schema.optional(),
  borderWidth: (schema) => schema.optional(),
  backgroundColor: (schema) => schema.optional(),
  textColor: (schema) => schema.optional(),
  customCSS: (schema) => schema.optional(),
  storeTitle: (schema) => schema.optional(),
  isDefault: (schema) => schema.optional(),
  isActive: (schema) => schema.optional()
});
export type LabelTemplateInsert = z.infer<typeof labelTemplateInsertSchema>;
export const labelTemplateSelectSchema = createSelectSchema(labelTemplates);
export type LabelTemplate = z.infer<typeof labelTemplateSelectSchema>;

// Print Jobs validation schemas
export const printJobInsertSchema = createInsertSchema(printJobs, {
  productIds: (schema) => schema.min(1, "Product IDs must be provided"),
  copies: (schema) => schema.min(1, "Copies must be at least 1"),
  labelsPerRow: (schema) => schema.min(1, "Labels per row must be at least 1"),
  totalLabels: (schema) => schema.min(1, "Total labels must be at least 1"),
  paperSize: (schema) => schema.optional(),
  orientation: (schema) => schema.optional(),
  status: (schema) => schema.optional(),
  customText: (schema) => schema.optional(),
  printSettings: (schema) => schema.optional()
});
export type PrintJobInsert = z.infer<typeof printJobInsertSchema>;
export const printJobSelectSchema = createSelectSchema(printJobs);
export type PrintJob = z.infer<typeof printJobSelectSchema>;

// Cash register table
export const cashRegisters = pgTable('cash_registers', {
  id: serial('id').primaryKey(),
  registerId: text('register_id').notNull().unique(),
  status: text('status').notNull().default('closed'), // 'open', 'closed'
  openingCash: decimal('opening_cash', { precision: 10, scale: 2 }).notNull().default('0'),
  currentCash: decimal('current_cash', { precision: 10, scale: 2 }).notNull().default('0'),
  cashReceived: decimal('cash_received', { precision: 10, scale: 2 }).notNull().default('0'),
  upiReceived: decimal('upi_received', { precision: 10, scale: 2 }).notNull().default('0'),
  cardReceived: decimal('card_received', { precision: 10, scale: 2 }).notNull().default('0'),
  bankReceived: decimal('bank_received', { precision: 10, scale: 2 }).notNull().default('0'),
  chequeReceived: decimal('cheque_received', { precision: 10, scale: 2 }).notNull().default('0'),
  otherReceived: decimal('other_received', { precision: 10, scale: 2 }).notNull().default('0'),
  totalWithdrawals: decimal('total_withdrawals', { precision: 10, scale: 2 }).notNull().default('0'),
  totalRefunds: decimal('total_refunds', { precision: 10, scale: 2 }).notNull().default('0'),
  totalSales: decimal('total_sales', { precision: 10, scale: 2 }).notNull().default('0'),
  openedAt: timestamp('opened_at').defaultNow().notNull(),
  closedAt: timestamp('closed_at'),
  openedBy: text('opened_by').notNull(),
  closedBy: text('closed_by'),
  notes: text('notes')
});

// Cash register transactions table
export const cashRegisterTransactions = pgTable('cash_register_transactions', {
  id: serial('id').primaryKey(),
  registerId: integer('register_id').references(() => cashRegisters.id).notNull(),
  type: text('type').notNull(), // 'opening', 'sale', 'withdrawal', 'deposit', 'closing'
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text('payment_method'), // 'cash', 'upi', 'card', 'bank', 'cheque', 'other'
  reason: text('reason'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: text('created_by').notNull()
});

// Cash register relations
export const cashRegistersRelations = relations(cashRegisters, ({ many }) => ({
  transactions: many(cashRegisterTransactions)
}));

export const cashRegisterTransactionsRelations = relations(cashRegisterTransactions, ({ one }) => ({
  register: one(cashRegisters, { fields: [cashRegisterTransactions.registerId], references: [cashRegisters.id] })
}));

// Cash register validation schemas
export const cashRegisterInsertSchema = createInsertSchema(cashRegisters, {
  openingCash: (schema) => schema.min(0, "Opening cash must be at least 0"),
  currentCash: (schema) => schema.min(0, "Current cash cannot be negative"),
  status: (schema) => schema.refine(val => ['open', 'closed'].includes(val), "Status must be 'open' or 'closed'")
});
export type CashRegisterInsert = z.infer<typeof cashRegisterInsertSchema>;
export const cashRegisterSelectSchema = createSelectSchema(cashRegisters);
export type CashRegister = z.infer<typeof cashRegisterSelectSchema>;

export const cashRegisterTransactionInsertSchema = createInsertSchema(cashRegisterTransactions, {
  amount: (schema) => schema.refine(val => Math.abs(parseFloat(val)) > 0, "Amount must be greater than 0"),
  type: (schema) => schema.refine(val => ['opening', 'sale', 'withdrawal', 'deposit', 'closing'].includes(val), "Invalid transaction type")
});
export type CashRegisterTransactionInsert = z.infer<typeof cashRegisterTransactionInsertSchema>;
export const cashRegisterTransactionSelectSchema = createSelectSchema(cashRegisterTransactions);
export type CashRegisterTransaction = z.infer<typeof cashRegisterTransactionSelectSchema>;

// Inventory adjustments table
export const inventoryAdjustments = pgTable('inventory_adjustments', {
  id: serial('id').primaryKey(),
  adjustmentNumber: text('adjustment_number').notNull().unique(),
  productId: integer('product_id').references(() => products.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  adjustmentType: text('adjustment_type').notNull(), // 'add', 'remove', 'transfer', 'correction'
  quantity: integer('quantity').notNull(), // Positive for add, negative for remove
  previousStock: integer('previous_stock').notNull(),
  newStock: integer('new_stock').notNull(),
  unitCost: decimal('unit_cost', { precision: 10, scale: 2 }),
  totalValue: decimal('total_value', { precision: 10, scale: 2 }),
  reason: text('reason').notNull(),
  notes: text('notes'),
  batchNumber: text('batch_number'),
  expiryDate: timestamp('expiry_date'),
  locationFrom: text('location_from'),
  locationTo: text('location_to'),
  referenceDocument: text('reference_document'),
  approved: boolean('approved').default(false),
  approvedBy: integer('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Inventory adjustments relations
export const inventoryAdjustmentsRelations = relations(inventoryAdjustments, ({ one }) => ({
  product: one(products, { fields: [inventoryAdjustments.productId], references: [products.id] }),
  user: one(users, { fields: [inventoryAdjustments.userId], references: [users.id] }),
  approver: one(users, { fields: [inventoryAdjustments.approvedBy], references: [users.id] })
}));

// Inventory adjustments validation schemas
export const inventoryAdjustmentInsertSchema = createInsertSchema(inventoryAdjustments, {
  quantity: (schema) => schema.refine(val => val !== 0, "Quantity cannot be zero"),
  adjustmentType: (schema) => schema.refine(val => ['add', 'remove', 'transfer', 'correction'].includes(val), "Invalid adjustment type"),
  reason: (schema) => schema.min(3, "Reason must be at least 3 characters"),
  unitCost: (schema) => z.union([z.string(), z.number()]).transform(val => val.toString()).optional(),
  totalValue: (schema) => z.union([z.string(), z.number()]).transform(val => val.toString()).optional()
});
export type InventoryAdjustmentInsert = z.infer<typeof inventoryAdjustmentInsertSchema>;
export const inventoryAdjustmentSelectSchema = createSelectSchema(inventoryAdjustments);
export type InventoryAdjustment = z.infer<typeof inventoryAdjustmentSelectSchema>;

// Expense categories table
export const expenseCategories = pgTable('expense_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Expenses table
export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  expenseNumber: text('expense_number').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  categoryId: integer('category_id').references(() => expenseCategories.id).notNull(),
  supplierId: integer('supplier_id').references(() => suppliers.id),
  paymentMethod: text('payment_method').notNull().default('cash'), // 'cash', 'upi', 'card', 'bank', 'cheque'
  expenseDate: timestamp('expense_date').notNull(),
  dueDate: timestamp('due_date'),
  status: text('status').notNull().default('pending'), // 'pending', 'paid', 'cancelled'
  paidAmount: decimal('paid_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  userId: integer('user_id').references(() => users.id).notNull(),
  receiptImage: text('receipt_image'),
  notes: text('notes'),
  tags: text('tags'), // comma-separated tags
  recurring: boolean('recurring').notNull().default(false),
  recurringPeriod: text('recurring_period'), // 'weekly', 'monthly', 'yearly'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Expense categories relations
export const expenseCategoriesRelations = relations(expenseCategories, ({ many }) => ({
  expenses: many(expenses)
}));

// Expenses relations
export const expensesRelations = relations(expenses, ({ one }) => ({
  category: one(expenseCategories, { fields: [expenses.categoryId], references: [expenseCategories.id] }),
  supplier: one(suppliers, { fields: [expenses.supplierId], references: [suppliers.id] }),
  user: one(users, { fields: [expenses.userId], references: [users.id] })
}));

// Expense categories validation schemas
export const expenseCategoryInsertSchema = createInsertSchema(expenseCategories, {
  name: (schema) => schema.min(1, "Category name is required"),
  description: (schema) => schema.optional(),
  active: (schema) => schema.optional()
});
export type ExpenseCategoryInsert = z.infer<typeof expenseCategoryInsertSchema>;
export const expenseCategorySelectSchema = createSelectSchema(expenseCategories);
export type ExpenseCategory = z.infer<typeof expenseCategorySelectSchema>;

// Expenses validation schemas
export const expenseInsertSchema = createInsertSchema(expenses, {
  title: (schema) => schema.min(1, "Expense title is required"),
  amount: (schema) => schema.min(0, "Amount must be at least 0"),
  description: (schema) => schema.optional(),
  paymentMethod: (schema) => schema.refine(val => ['cash', 'upi', 'card', 'bank', 'cheque'].includes(val), "Invalid payment method"),
  status: (schema) => schema.refine(val => ['pending', 'paid', 'cancelled'].includes(val), "Invalid status").optional(),
  paidAmount: (schema) => schema.min(0, "Paid amount must be at least 0").optional(),
  receiptImage: (schema) => schema.optional(),
  notes: (schema) => schema.optional(),
  tags: (schema) => schema.optional(),
  recurring: (schema) => schema.optional(),
  recurringPeriod: (schema) => schema.optional(),
  supplierId: (schema) => schema.optional(),
  dueDate: (schema) => schema.optional()
});
export type ExpenseInsert = z.infer<typeof expenseInsertSchema>;
export const expenseSelectSchema = createSelectSchema(expenses);
export type Expense = z.infer<typeof expenseSelectSchema>;

// Offers table for managing promotional offers
export const offers = pgTable('offers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  offerType: text('offer_type').notNull(), // 'percentage', 'flat_amount', 'buy_x_get_y', 'time_based', 'category_based', 'loyalty_points'
  discountValue: decimal('discount_value', { precision: 10, scale: 2 }).notNull(),
  minPurchaseAmount: decimal('min_purchase_amount', { precision: 10, scale: 2 }).default('0'),
  maxDiscountAmount: decimal('max_discount_amount', { precision: 10, scale: 2 }),
  
  // Buy X Get Y specific fields
  buyQuantity: integer('buy_quantity'),
  getQuantity: integer('get_quantity'),
  freeProductId: integer('free_product_id').references(() => products.id),
  
  // Time-based offer fields
  validFrom: timestamp('valid_from'),
  validTo: timestamp('valid_to'),
  timeStart: text('time_start'), // HH:MM format
  timeEnd: text('time_end'), // HH:MM format
  
  // Category/Product specific
  applicableCategories: text('applicable_categories'), // JSON array of category IDs
  applicableProducts: text('applicable_products'), // JSON array of product IDs
  
  // Loyalty points
  pointsMultiplier: decimal('points_multiplier', { precision: 5, scale: 2 }).default('1'),
  pointsThreshold: decimal('points_threshold', { precision: 10, scale: 2 }).default('1000'),
  pointsReward: decimal('points_reward', { precision: 10, scale: 2 }).default('10'),
  
  // Usage tracking
  usageLimit: integer('usage_limit'), // null = unlimited
  usageCount: integer('usage_count').default(0),
  perCustomerLimit: integer('per_customer_limit'),
  
  // Status and metadata
  active: boolean('active').notNull().default(true),
  priority: integer('priority').default(1), // Higher number = higher priority
  createdBy: integer('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Offer usage tracking
export const offerUsage = pgTable('offer_usage', {
  id: serial('id').primaryKey(),
  offerId: integer('offer_id').references(() => offers.id).notNull(),
  saleId: integer('sale_id').references(() => sales.id).notNull(),
  customerId: integer('customer_id').references(() => customers.id),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).notNull(),
  originalAmount: decimal('original_amount', { precision: 10, scale: 2 }).notNull(),
  finalAmount: decimal('final_amount', { precision: 10, scale: 2 }).notNull(),
  pointsEarned: decimal('points_earned', { precision: 10, scale: 2 }).default('0'),
  usedAt: timestamp('used_at').defaultNow().notNull()
});

// Customer loyalty points
export const customerLoyalty = pgTable('customer_loyalty', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').references(() => customers.id).notNull().unique(),
  totalPoints: decimal('total_points', { precision: 10, scale: 2 }).default('0'),
  usedPoints: decimal('used_points', { precision: 10, scale: 2 }).default('0'),
  availablePoints: decimal('available_points', { precision: 10, scale: 2 }).default('0'),
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Relations for offers
export const offersRelations = relations(offers, ({ one, many }) => ({
  creator: one(users, { fields: [offers.createdBy], references: [users.id] }),
  freeProduct: one(products, { fields: [offers.freeProductId], references: [products.id] }),
  usage: many(offerUsage)
}));

export const offerUsageRelations = relations(offerUsage, ({ one }) => ({
  offer: one(offers, { fields: [offerUsage.offerId], references: [offers.id] }),
  sale: one(sales, { fields: [offerUsage.saleId], references: [sales.id] }),
  customer: one(customers, { fields: [offerUsage.customerId], references: [customers.id] })
}));

export const customerLoyaltyRelations = relations(customerLoyalty, ({ one }) => ({
  customer: one(customers, { fields: [customerLoyalty.customerId], references: [customers.id] })
}));

// Offers validation schemas
export const offerInsertSchema = createInsertSchema(offers, {
  name: (schema) => schema.min(1, "Offer name is required"),
  offerType: (schema) => schema.refine(val => 
    ['percentage', 'flat_amount', 'buy_x_get_y', 'time_based', 'category_based', 'loyalty_points'].includes(val), 
    "Invalid offer type"
  ),
  discountValue: (schema) => schema.min(0, "Discount value must be positive"),
  minPurchaseAmount: (schema) => schema.min(0, "Minimum purchase amount must be positive").optional(),
  maxDiscountAmount: (schema) => schema.min(0, "Maximum discount amount must be positive").optional(),
  buyQuantity: (schema) => schema.min(1, "Buy quantity must be at least 1").optional(),
  getQuantity: (schema) => schema.min(1, "Get quantity must be at least 1").optional(),
  usageLimit: (schema) => schema.min(1, "Usage limit must be at least 1").optional(),
  perCustomerLimit: (schema) => schema.min(1, "Per customer limit must be at least 1").optional(),
  priority: (schema) => schema.min(1, "Priority must be at least 1").optional(),
  active: (schema) => schema.optional()
});
export type OfferInsert = z.infer<typeof offerInsertSchema>;
export const offerSelectSchema = createSelectSchema(offers);
export type Offer = z.infer<typeof offerSelectSchema>;

export const offerUsageInsertSchema = createInsertSchema(offerUsage);
export type OfferUsageInsert = z.infer<typeof offerUsageInsertSchema>;
export const offerUsageSelectSchema = createSelectSchema(offerUsage);
export type OfferUsage = z.infer<typeof offerUsageSelectSchema>;

export const customerLoyaltyInsertSchema = createInsertSchema(customerLoyalty);
export type CustomerLoyaltyInsert = z.infer<typeof customerLoyaltyInsertSchema>;
export const customerLoyaltySelectSchema = createSelectSchema(customerLoyalty);
export type CustomerLoyalty = z.infer<typeof customerLoyaltySelectSchema>;

export const settingsInsertSchema = createInsertSchema(settings, {
  key: (schema) => schema.min(1, "Key must not be empty"),
  value: (schema) => schema.min(1, "Value must not be empty")
});
export type SettingsInsert = z.infer<typeof settingsInsertSchema>;
export const settingsSelectSchema = createSelectSchema(settings);
export type Settings = z.infer<typeof settingsSelectSchema>;