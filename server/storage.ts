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
  cashRegisters,
  cashRegisterTransactions,
  inventoryAdjustments,
  expenses,
  expenseCategories,
  offers,
  offerUsage,
  customerLoyalty,
  User,
  Product,
  Category,
  Customer,
  Supplier,
  Sale,
  SaleItem,
  Purchase,
  PurchaseItem,
  CashRegister,
  CashRegisterTransaction,
  InventoryAdjustment,
  Expense,
  ExpenseCategory,
  ExpenseInsert,
  ExpenseCategoryInsert,
  Offer,
  OfferInsert,
  OfferUsage,
  OfferUsageInsert,
  CustomerLoyalty,
  CustomerLoyaltyInsert
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
    hsnCode?: string;
    cgstRate?: string;
    sgstRate?: string;
    igstRate?: string;
    cessRate?: string;
    taxCalculationMethod?: string;
    manufacturerName?: string;
    supplierName?: string;
    manufacturerId?: number;
    supplierId?: number;
  }): Promise<Product> {
    try {
      // Import SQLite database directly
      const { sqlite } = await import('../db/index.js');

      const insertProduct = sqlite.prepare(`
        INSERT INTO products (
          name, description, sku, price, mrp, cost, weight, weight_unit, category_id, 
          stock_quantity, alert_threshold, barcode, image, active, hsn_code,
          cgst_rate, sgst_rate, igst_rate, cess_rate, tax_calculation_method,
          manufacturer_name, supplier_name, manufacturer_id, supplier_id,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
        product.active !== false ? 1 : 0,
        product.hsnCode || null,
        product.cgstRate || '0',
        product.sgstRate || '0',
        product.igstRate || '0',
        product.cessRate || '0',
        product.taxCalculationMethod || 'exclusive',
        product.manufacturerName || null,
        product.supplierName || null,
        product.manufacturerId || null,
        product.supplierId || null
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

      // Import SQLite database directly for reliable operations
      const { sqlite } = await import('../db/index.js');

      // First check if product exists
      const existingProduct = sqlite.prepare('SELECT * FROM products WHERE id = ?').get(id);
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
        mrp: productData.mrp ? parseFloat(productData.mrp.toString()) : parseFloat(existingProduct.mrp || 0),
        weight: productData.weight ? parseFloat(productData.weight.toString()) : existingProduct.weight,
        weightUnit: productData.weightUnit?.toString() || existingProduct.weight_unit || 'kg',
        categoryId: productData.categoryId ? parseInt(productData.categoryId.toString()) : existingProduct.category_id,
        stockQuantity: productData.stockQuantity !== undefined ? parseInt(productData.stockQuantity.toString()) : existingProduct.stock_quantity,
        alertThreshold: productData.alertThreshold !== undefined ? parseInt(productData.alertThreshold.toString()) : existingProduct.alert_threshold || 5,
        barcode: productData.barcode?.toString().trim() || existingProduct.barcode || '',
        hsnCode: productData.hsnCode?.toString().trim() || existingProduct.hsn_code || '',
        cgstRate: productData.cgstRate !== undefined ? productData.cgstRate?.toString() : existingProduct.cgst_rate || '0',
        sgstRate: productData.sgstRate !== undefined ? productData.sgstRate?.toString() : existingProduct.sgst_rate || '0',
        igstRate: productData.igstRate !== undefined ? productData.igstRate?.toString() : existingProduct.igst_rate || '0',
        cessRate: productData.cessRate !== undefined ? productData.cessRate?.toString() : existingProduct.cess_rate || '0',
        taxCalculationMethod: productData.taxCalculationMethod?.toString() || existingProduct.tax_calculation_method || 'exclusive',
        
        // Supplier & Manufacturer Information
        manufacturerName: productData.manufacturerName?.toString() || existingProduct.manufacturer_name || '',
        supplierName: productData.supplierName?.toString() || existingProduct.supplier_name || '',
        manufacturerId: productData.manufacturerId ? parseInt(productData.manufacturerId.toString()) : existingProduct.manufacturer_id,
        supplierId: productData.supplierId ? parseInt(productData.supplierId.toString()) : existingProduct.supplier_id,
        
        // Product Classification
        alias: productData.alias?.toString() || existingProduct.alias || '',
        itemProductType: productData.itemProductType?.toString() || existingProduct.item_product_type || 'Standard',
        department: productData.department?.toString() || existingProduct.department || '',
        brand: productData.brand?.toString() || existingProduct.brand || '',
        buyer: productData.buyer?.toString() || existingProduct.buyer || '',
        purchaseGstCalculatedOn: productData.purchaseGstCalculatedOn?.toString() || existingProduct.purchase_gst_calculated_on || 'MRP',
        gstUom: productData.gstUom?.toString() || existingProduct.gst_uom || 'PIECES',
        purchaseAbatement: productData.purchaseAbatement?.toString() || existingProduct.purchase_abatement || '',
        
        // Configuration Options
        configItemWithCommodity: productData.configItemWithCommodity !== undefined ? (productData.configItemWithCommodity ? 1 : 0) : (existingProduct.config_item_with_commodity || 0),
        seniorExemptApplicable: productData.seniorExemptApplicable !== undefined ? (productData.seniorExemptApplicable ? 1 : 0) : (existingProduct.senior_exempt_applicable || 0),
        eanCodeRequired: productData.eanCodeRequired !== undefined ? (productData.eanCodeRequired ? 1 : 0) : (existingProduct.ean_code_required || 0),
        
        // Weight & Packaging Information
        weightsPerUnit: productData.weightsPerUnit?.toString() || existingProduct.weights_per_unit || '1',
        batchExpiryDetails: productData.batchExpiryDetails?.toString() || existingProduct.batch_expiry_details || 'Not Required',
        itemPreparationsStatus: productData.itemPreparationsStatus?.toString() || existingProduct.item_preparations_status || 'Bulk',
        grindingCharge: productData.grindingCharge?.toString() || existingProduct.grinding_charge || '',
        weightInGms: productData.weightInGms?.toString() || existingProduct.weight_in_gms || '1000',
        bulkItemName: productData.bulkItemName?.toString() || existingProduct.bulk_item_name || '',
        repackageUnits: productData.repackageUnits?.toString() || existingProduct.repackage_units || '',
        repackageType: productData.repackageType?.toString() || existingProduct.repackage_type || '',
        packagingMaterial: productData.packagingMaterial?.toString() || existingProduct.packaging_material || '',
        decimalPoint: productData.decimalPoint?.toString() || existingProduct.decimal_point || '0',
        productType: productData.productType?.toString() || existingProduct.product_type || 'NA',
        sellBy: productData.sellBy?.toString() || existingProduct.sell_by || 'None',
        itemPerUnit: productData.itemPerUnit?.toString() || existingProduct.item_per_unit || '1',
        maintainSellingMrpBy: productData.maintainSellingMrpBy?.toString() || existingProduct.maintain_selling_mrp_by || 'Multiple Selling Price & Multiple MRP',
        batchSelection: productData.batchSelection?.toString() || existingProduct.batch_selection || 'Not Applicable',
        
        // Item Properties
        isWeighable: productData.isWeighable !== undefined ? (productData.isWeighable ? 1 : 0) : (existingProduct.is_weighable || 0),
        skuType: productData.skuType?.toString() || existingProduct.sku_type || 'Put Away',
        indentType: productData.indentType?.toString() || existingProduct.indent_type || 'Manual',
        gateKeeperMargin: productData.gateKeeperMargin?.toString() || existingProduct.gate_keeper_margin || '',
        allowItemFree: productData.allowItemFree !== undefined ? (productData.allowItemFree ? 1 : 0) : (existingProduct.allow_item_free || 0),
        showOnMobileDashboard: productData.showOnMobileDashboard !== undefined ? (productData.showOnMobileDashboard ? 1 : 0) : (existingProduct.show_on_mobile_dashboard || 0),
        enableMobileNotifications: productData.enableMobileNotifications !== undefined ? (productData.enableMobileNotifications ? 1 : 0) : (existingProduct.enable_mobile_notifications || 0),
        quickAddToCart: productData.quickAddToCart !== undefined ? (productData.quickAddToCart ? 1 : 0) : (existingProduct.quick_add_to_cart || 0),
        perishableItem: productData.perishableItem !== undefined ? (productData.perishableItem ? 1 : 0) : (existingProduct.perishable_item || 0),
        temperatureControlled: productData.temperatureControlled !== undefined ? (productData.temperatureControlled ? 1 : 0) : (existingProduct.temperature_controlled || 0),
        fragileItem: productData.fragileItem !== undefined ? (productData.fragileItem ? 1 : 0) : (existingProduct.fragile_item || 0),
        trackSerialNumbers: productData.trackSerialNumbers !== undefined ? (productData.trackSerialNumbers ? 1 : 0) : (existingProduct.track_serial_numbers || 0),
        fdaApproved: productData.fdaApproved !== undefined ? (productData.fdaApproved ? 1 : 0) : (existingProduct.fda_approved || 0),
        bisCertified: productData.bisCertified !== undefined ? (productData.bisCertified ? 1 : 0) : (existingProduct.bis_certified || 0),
        organicCertified: productData.organicCertified !== undefined ? (productData.organicCertified ? 1 : 0) : (existingProduct.organic_certified || 0),
        itemIngredients: productData.itemIngredients?.toString() || existingProduct.item_ingredients || '',
        
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
      const duplicateSku = sqlite.prepare('SELECT id FROM products WHERE LOWER(sku) = LOWER(?) AND id != ?').get(updateData.sku, id);
      if (duplicateSku) {
        throw new Error('Product with this SKU already exists');
      }

      console.log('Formatted update data:', updateData);

      // Perform the update using correct column names
      const updateStmt = sqlite.prepare(`
        UPDATE products SET 
          name = ?,
          description = ?,
          sku = ?,
          price = ?,
          cost = ?,
          mrp = ?,
          weight = ?,
          weight_unit = ?,
          category_id = ?,
          stock_quantity = ?,
          alert_threshold = ?,
          barcode = ?,
          hsn_code = ?,
          cgst_rate = ?,
          sgst_rate = ?,
          igst_rate = ?,
          cess_rate = ?,
          tax_calculation_method = ?,
          manufacturer_name = ?,
          supplier_name = ?,
          manufacturer_id = ?,
          supplier_id = ?,
          alias = ?,
          item_product_type = ?,
          department = ?,
          brand = ?,
          buyer = ?,
          purchase_gst_calculated_on = ?,
          gst_uom = ?,
          purchase_abatement = ?,
          config_item_with_commodity = ?,
          senior_exempt_applicable = ?,
          ean_code_required = ?,
          weights_per_unit = ?,
          batch_expiry_details = ?,
          item_preparations_status = ?,
          grinding_charge = ?,
          weight_in_gms = ?,
          bulk_item_name = ?,
          repackage_units = ?,
          repackage_type = ?,
          packaging_material = ?,
          decimal_point = ?,
          product_type = ?,
          sell_by = ?,
          item_per_unit = ?,
          maintain_selling_mrp_by = ?,
          batch_selection = ?,
          is_weighable = ?,
          sku_type = ?,
          indent_type = ?,
          gate_keeper_margin = ?,
          allow_item_free = ?,
          show_on_mobile_dashboard = ?,
          enable_mobile_notifications = ?,
          quick_add_to_cart = ?,
          perishable_item = ?,
          temperature_controlled = ?,
          fragile_item = ?,
          track_serial_numbers = ?,
          fda_approved = ?,
          bis_certified = ?,
          organic_certified = ?,
          item_ingredients = ?,
          active = ?,
          updated_at = ?
        WHERE id = ?
      `);

      const result = updateStmt.run(
        updateData.name,
        updateData.description,
        updateData.sku,
        updateData.price.toString(),
        updateData.cost.toString(),
        updateData.mrp.toString(),
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
        updateData.manufacturerName,
        updateData.supplierName,
        updateData.manufacturerId,
        updateData.supplierId,
        updateData.alias,
        updateData.itemProductType,
        updateData.department,
        updateData.brand,
        updateData.buyer,
        updateData.purchaseGstCalculatedOn,
        updateData.gstUom,
        updateData.purchaseAbatement,
        updateData.configItemWithCommodity,
        updateData.seniorExemptApplicable,
        updateData.eanCodeRequired,
        updateData.weightsPerUnit,
        updateData.batchExpiryDetails,
        updateData.itemPreparationsStatus,
        updateData.grindingCharge,
        updateData.weightInGms,
        updateData.bulkItemName,
        updateData.repackageUnits,
        updateData.repackageType,
        updateData.packagingMaterial,
        updateData.decimalPoint,
        updateData.productType,
        updateData.sellBy,
        updateData.itemPerUnit,
        updateData.maintainSellingMrpBy,
        updateData.batchSelection,
        updateData.isWeighable,
        updateData.skuType,
        updateData.indentType,
        updateData.gateKeeperMargin,
        updateData.allowItemFree,
        updateData.showOnMobileDashboard,
        updateData.enableMobileNotifications,
        updateData.quickAddToCart,
        updateData.perishableItem,
        updateData.temperatureControlled,
        updateData.fragileItem,
        updateData.trackSerialNumbers,
        updateData.fdaApproved,
        updateData.bisCertified,
        updateData.organicCertified,
        updateData.itemIngredients,
        updateData.active,
        updateData.updatedAt,
        id
      );

      if (result.changes === 0) {
        console.log('No changes made to product:', id);
      }

      console.log('Product updated successfully:', result);

      // Fetch and return the updated product with category
      const updatedProduct = sqlite.prepare(`
        SELECT 
          p.*,
          c.name as categoryName 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        WHERE p.id = ?
      `).get(id);

      // Format the product response to match expected structure
      if (updatedProduct) {
        return {
          id: updatedProduct.id,
          name: updatedProduct.name,
          description: updatedProduct.description,
          sku: updatedProduct.sku,
          price: updatedProduct.price,
          mrp: updatedProduct.mrp,
          cost: updatedProduct.cost,
          weight: updatedProduct.weight,
          weightUnit: updatedProduct.weight_unit,
          categoryId: updatedProduct.category_id,
          stockQuantity: updatedProduct.stock_quantity,
          alertThreshold: updatedProduct.alert_threshold,
          barcode: updatedProduct.barcode,
          hsnCode: updatedProduct.hsn_code,
          cgstRate: updatedProduct.cgst_rate,
          sgstRate: updatedProduct.sgst_rate,
          igstRate: updatedProduct.igst_rate,
          cessRate: updatedProduct.cess_rate,
          taxCalculationMethod: updatedProduct.tax_calculation_method,
          
          // Supplier & Manufacturer Information
          manufacturerName: updatedProduct.manufacturer_name,
          supplierName: updatedProduct.supplier_name,
          manufacturerId: updatedProduct.manufacturer_id,
          supplierId: updatedProduct.supplier_id,
          
          // Product Classification
          alias: updatedProduct.alias,
          itemProductType: updatedProduct.item_product_type,
          department: updatedProduct.department,
          brand: updatedProduct.brand,
          buyer: updatedProduct.buyer,
          purchaseGstCalculatedOn: updatedProduct.purchase_gst_calculated_on,
          gstUom: updatedProduct.gst_uom,
          purchaseAbatement: updatedProduct.purchase_abatement,
          
          // Configuration Options
          configItemWithCommodity: Boolean(updatedProduct.config_item_with_commodity),
          seniorExemptApplicable: Boolean(updatedProduct.senior_exempt_applicable),
          eanCodeRequired: Boolean(updatedProduct.ean_code_required),
          
          // Weight & Packaging Information
          weightsPerUnit: updatedProduct.weights_per_unit,
          batchExpiryDetails: updatedProduct.batch_expiry_details,
          itemPreparationsStatus: updatedProduct.item_preparations_status,
          grindingCharge: updatedProduct.grinding_charge,
          weightInGms: updatedProduct.weight_in_gms,
          bulkItemName: updatedProduct.bulk_item_name,
          repackageUnits: updatedProduct.repackage_units,
          repackageType: updatedProduct.repackage_type,
          packagingMaterial: updatedProduct.packaging_material,
          decimalPoint: updatedProduct.decimal_point,
          productType: updatedProduct.product_type,
          sellBy: updatedProduct.sell_by,
          itemPerUnit: updatedProduct.item_per_unit,
          maintainSellingMrpBy: updatedProduct.maintain_selling_mrp_by,
          batchSelection: updatedProduct.batch_selection,
          
          // Item Properties
          isWeighable: Boolean(updatedProduct.is_weighable),
          skuType: updatedProduct.sku_type,
          indentType: updatedProduct.indent_type,
          gateKeeperMargin: updatedProduct.gate_keeper_margin,
          allowItemFree: Boolean(updatedProduct.allow_item_free),
          showOnMobileDashboard: Boolean(updatedProduct.show_on_mobile_dashboard),
          enableMobileNotifications: Boolean(updatedProduct.enable_mobile_notifications),
          quickAddToCart: Boolean(updatedProduct.quick_add_to_cart),
          perishableItem: Boolean(updatedProduct.perishable_item),
          temperatureControlled: Boolean(updatedProduct.temperature_controlled),
          fragileItem: Boolean(updatedProduct.fragile_item),
          trackSerialNumbers: Boolean(updatedProduct.track_serial_numbers),
          fdaApproved: Boolean(updatedProduct.fda_approved),
          bisCertified: Boolean(updatedProduct.bis_certified),
          organicCertified: Boolean(updatedProduct.organic_certified),
          itemIngredients: updatedProduct.item_ingredients,
          
          active: Boolean(updatedProduct.active),
          createdAt: new Date(updatedProduct.created_at),
          updatedAt: new Date(updatedProduct.updated_at),
          category: {
            id: updatedProduct.category_id,
            name: updatedProduct.categoryName || 'Uncategorized'
          }
        };
      }

      return null;
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
          // Get the received quantity and free quantity - both should be added to stock
          const receivedQty = Number(item.receivedQty) || Number(item.quantity) || 0;
          const freeQty = Number(item.freeQty) || 0;
          const quantity = Number(item.quantity) || receivedQty || 1;
          const unitCost = Number(item.unitCost) || 0;

          console.log(`Processing item: Product ID ${item.productId}, Received Qty: ${receivedQty}, Free Qty: ${freeQty}, Unit Cost: ${unitCost}`);

          // Insert purchase item
          insertItem.run(
            purchaseId,
            item.productId,
            quantity,
            receivedQty,
            freeQty,
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

          // Update product stock with received quantity PLUS free quantity
          const totalStockToAdd = receivedQty + freeQty;
          if (totalStockToAdd > 0 && item.productId) {
            try {
              const result = updateStock.run(totalStockToAdd, item.productId);
              console.log(`📦 Stock update result for product ${item.productId}: Added ${totalStockToAdd} units (Received: ${receivedQty} + Free: ${freeQty}) (Changes: ${result.changes})`);

              // Verify the stock update
              const checkStock = sqlite.prepare('SELECT stock_quantity FROM products WHERE id = ?');
              const currentStock = checkStock.get(item.productId);
              console.log(`📊 Current stock for product ${item.productId}: ${currentStock?.stock_quantity}`);
            } catch (error) {
              console.error(`❌ Error updating stock for product ${item.productId}:`, error);
            }
          } else {
            console.log(`⚠️ Skipping stock update for product ${item.productId}: totalStockToAdd = ${totalStockToAdd} (Received: ${receivedQty}, Free: ${freeQty})`);
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
          p.sku as product_sku,
          p.cgst_rate,
          p.sgst_rate,
          p.igst_rate
        FROM purchase_items pi
        LEFT JOIN products p ON pi.product_id = p.id
        WHERE pi.purchase_id = ?
        ORDER BY pi.id
      `).all(id);

      // Format items with proper tax percentage display
      const formattedItems = items.map(item => {
        let taxPercentage = 0;
        
        // Calculate total GST from product if available
        if (item.cgst_rate || item.sgst_rate || item.igst_rate) {
          const cgst = parseFloat(item.cgst_rate || '0');
          const sgst = parseFloat(item.sgst_rate || '0');
          const igst = parseFloat(item.igst_rate || '0');
          taxPercentage = cgst + sgst + igst;
        } else if (item.tax_percentage) {
          // Use stored tax percentage if available
          taxPercentage = parseFloat(item.tax_percentage) || 0;
        }

        return {
          ...item,
          tax_percentage: taxPercentage,
          taxPercentage: taxPercentage, // Ensure both formats are available
          // Format other numeric fields properly
          unit_cost: parseFloat(item.unit_cost || '0'),
          quantity: parseInt(item.quantity || '0'),
          received_qty: parseInt(item.received_qty || '0'),
          net_amount: parseFloat(item.net_amount || '0'),
          discount_amount: parseFloat(item.discount_amount || '0'),
          discount_percent: parseFloat(item.discount_percent || '0')
        };
      });

      return {
        ...purchase,
        items: formattedItems
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
            SELECT product_id, received_qty, free_qty FROM purchase_items WHERE purchase_id = ?
          `).all(id);

          // Create a map of existing received and free quantities
          const existingReceivedMap = new Map();
          const existingFreeMap = new Map();
          existingItems.forEach((item: any) => {
            existingReceivedMap.set(item.product_id, item.received_qty || 0);
            existingFreeMap.set(item.product_id, item.free_qty || 0);
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

              // Calculate stock difference including free quantity
              const newReceivedQty = item.receivedQty || 0;
              const newFreeQty = item.freeQty || 0;
              const oldReceivedQty = existingReceivedMap.get(item.productId) || 0;
              const oldFreeQty = existingFreeMap.get(item.productId) || 0;
              
              const newTotalStock = newReceivedQty + newFreeQty;
              const oldTotalStock = oldReceivedQty + oldFreeQty;
              const stockDifference = newTotalStock - oldTotalStock;

              if (stockDifference !== 0 && item.productId) {
                updateStock.run(stockDifference, item.productId);
                console.log(`📦 Stock adjustment for product ${item.productId}: ${stockDifference > 0 ? '+' : ''}${stockDifference} (Received: ${newReceivedQty - oldReceivedQty}, Free: ${newFreeQty - oldFreeQty})`);
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
  },

  // Cash Register Operations
  async createCashRegister(data: {
    registerId: string;
    openingCash: number;
    openedBy: string;
    notes?: string;
  }): Promise<CashRegister> {
    try {
      const { sqlite } = await import('../db/index.js');
      
      const insertRegister = sqlite.prepare(`
        INSERT INTO cash_registers (
          register_id, status, opening_cash, current_cash, opened_by, notes, opened_at
        ) VALUES (?, 'open', ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      const result = insertRegister.run(
        data.registerId,
        data.openingCash.toString(),
        data.openingCash.toString(),
        data.openedBy,
        data.notes || null
      );

      const getRegister = sqlite.prepare('SELECT * FROM cash_registers WHERE id = ?');
      const newRegister = getRegister.get(result.lastInsertRowid);

      return {
        ...newRegister,
        openedAt: new Date(newRegister.opened_at),
        closedAt: newRegister.closed_at ? new Date(newRegister.closed_at) : null
      };
    } catch (error) {
      console.error('Error creating cash register:', error);
      throw error;
    }
  },

  async updateCashRegister(id: number, data: Partial<CashRegister>): Promise<CashRegister | null> {
    try {
      const { sqlite } = await import('../db/index.js');
      
      const updateFields = [];
      const updateValues = [];

      if (data.currentCash !== undefined) {
        updateFields.push('current_cash = ?');
        updateValues.push(data.currentCash.toString());
      }
      if (data.cashReceived !== undefined) {
        updateFields.push('cash_received = ?');
        updateValues.push(data.cashReceived.toString());
      }
      if (data.upiReceived !== undefined) {
        updateFields.push('upi_received = ?');
        updateValues.push(data.upiReceived.toString());
      }
      if (data.cardReceived !== undefined) {
        updateFields.push('card_received = ?');
        updateValues.push(data.cardReceived.toString());
      }
      if (data.bankReceived !== undefined) {
        updateFields.push('bank_received = ?');
        updateValues.push(data.bankReceived.toString());
      }
      if (data.chequeReceived !== undefined) {
        updateFields.push('cheque_received = ?');
        updateValues.push(data.chequeReceived.toString());
      }
      if (data.otherReceived !== undefined) {
        updateFields.push('other_received = ?');
        updateValues.push(data.otherReceived.toString());
      }
      if (data.totalWithdrawals !== undefined) {
        updateFields.push('total_withdrawals = ?');
        updateValues.push(data.totalWithdrawals.toString());
      }
      if (data.totalRefunds !== undefined) {
        updateFields.push('total_refunds = ?');
        updateValues.push(data.totalRefunds.toString());
      }
      if (data.totalSales !== undefined) {
        updateFields.push('total_sales = ?');
        updateValues.push(data.totalSales.toString());
      }
      if (data.status !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(data.status);
      }
      if (data.closedBy !== undefined) {
        updateFields.push('closed_by = ?');
        updateValues.push(data.closedBy);
      }
      if (data.status === 'closed') {
        updateFields.push('closed_at = ?');
        updateValues.push(new Date().toISOString());
      }

      if (updateFields.length === 0) {
        return null;
      }

      updateValues.push(id);
      
      const updateRegister = sqlite.prepare(`
        UPDATE cash_registers 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `);

      updateRegister.run(...updateValues);

      const getRegister = sqlite.prepare('SELECT * FROM cash_registers WHERE id = ?');
      const updatedRegister = getRegister.get(id);

      return updatedRegister ? {
        id: updatedRegister.id,
        registerId: updatedRegister.register_id,
        status: updatedRegister.status,
        openingCash: updatedRegister.opening_cash,
        currentCash: updatedRegister.current_cash,
        cashReceived: updatedRegister.cash_received,
        upiReceived: updatedRegister.upi_received,
        cardReceived: updatedRegister.card_received,
        bankReceived: updatedRegister.bank_received,
        chequeReceived: updatedRegister.cheque_received,
        otherReceived: updatedRegister.other_received,
        totalWithdrawals: updatedRegister.total_withdrawals,
        totalRefunds: updatedRegister.total_refunds,
        totalSales: updatedRegister.total_sales,
        notes: updatedRegister.notes,
        openedBy: updatedRegister.opened_by,
        closedBy: updatedRegister.closed_by,
        openedAt: new Date(updatedRegister.opened_at),
        closedAt: updatedRegister.closed_at ? new Date(updatedRegister.closed_at) : null
      } : null;
    } catch (error) {
      console.error('Error updating cash register:', error);
      throw error;
    }
  },

  async getCashRegisterById(id: number): Promise<CashRegister | null> {
    try {
      const { sqlite } = await import('../db/index.js');
      const getRegister = sqlite.prepare('SELECT * FROM cash_registers WHERE id = ?');
      const register = getRegister.get(id);

      return register ? {
        id: register.id,
        registerId: register.register_id,
        status: register.status,
        openingCash: register.opening_cash,
        currentCash: register.current_cash,
        cashReceived: register.cash_received,
        upiReceived: register.upi_received,
        cardReceived: register.card_received,
        bankReceived: register.bank_received,
        chequeReceived: register.cheque_received,
        otherReceived: register.other_received,
        totalWithdrawals: register.total_withdrawals,
        totalRefunds: register.total_refunds,
        totalSales: register.total_sales,
        notes: register.notes,
        openedBy: register.opened_by,
        closedBy: register.closed_by,
        openedAt: new Date(register.opened_at),
        closedAt: register.closed_at ? new Date(register.closed_at) : null
      } : null;
    } catch (error) {
      console.error('Error fetching cash register:', error);
      return null;
    }
  },

  async getActiveCashRegister(): Promise<CashRegister | null> {
    try {
      const { sqlite } = await import('../db/index.js');
      const getRegister = sqlite.prepare(`
        SELECT * FROM cash_registers 
        WHERE status = 'open' 
        ORDER BY opened_at DESC 
        LIMIT 1
      `);
      const register = getRegister.get();

      return register ? {
        id: register.id,
        registerId: register.register_id,
        status: register.status,
        openingCash: register.opening_cash,
        currentCash: register.current_cash,
        cashReceived: register.cash_received,
        upiReceived: register.upi_received,
        cardReceived: register.card_received,
        bankReceived: register.bank_received,
        chequeReceived: register.cheque_received,
        otherReceived: register.other_received,
        totalWithdrawals: register.total_withdrawals,
        totalRefunds: register.total_refunds,
        totalSales: register.total_sales,
        notes: register.notes,
        openedBy: register.opened_by,
        closedBy: register.closed_by,
        openedAt: new Date(register.opened_at),
        closedAt: register.closed_at ? new Date(register.closed_at) : null
      } : null;
    } catch (error) {
      console.error('Error fetching active cash register:', error);
      return null;
    }
  },

  async listCashRegisters(limit: number = 20): Promise<CashRegister[]> {
    try {
      const { sqlite } = await import('../db/index.js');
      const getRegisters = sqlite.prepare(`
        SELECT * FROM cash_registers 
        ORDER BY opened_at DESC 
        LIMIT ?
      `);
      const registers = getRegisters.all(limit);

      return registers.map((register: any) => ({
        ...register,
        openedAt: new Date(register.opened_at),
        closedAt: register.closed_at ? new Date(register.closed_at) : null
      }));
    } catch (error) {
      console.error('Error listing cash registers:', error);
      return [];
    }
  },

  async addCashRegisterTransaction(data: {
    registerId: number;
    type: string;
    amount: number;
    paymentMethod?: string;
    reason?: string;
    notes?: string;
    createdBy: string;
  }): Promise<CashRegisterTransaction> {
    try {
      const { sqlite } = await import('../db/index.js');
      
      const insertTransaction = sqlite.prepare(`
        INSERT INTO cash_register_transactions (
          register_id, type, amount, payment_method, reason, notes, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      const result = insertTransaction.run(
        data.registerId,
        data.type,
        data.amount.toString(),
        data.paymentMethod || null,
        data.reason || null,
        data.notes || null,
        data.createdBy
      );

      const getTransaction = sqlite.prepare('SELECT * FROM cash_register_transactions WHERE id = ?');
      const newTransaction = getTransaction.get(result.lastInsertRowid);

      return {
        ...newTransaction,
        createdAt: new Date(newTransaction.created_at)
      };
    } catch (error) {
      console.error('Error creating cash register transaction:', error);
      throw error;
    }
  },

  async getCashRegisterTransactions(registerId: number): Promise<CashRegisterTransaction[]> {
    try {
      const { sqlite } = await import('../db/index.js');
      const getTransactions = sqlite.prepare(`
        SELECT * FROM cash_register_transactions 
        WHERE register_id = ? 
        ORDER BY created_at DESC
      `);
      const transactions = getTransactions.all(registerId);

      return transactions.map((transaction: any) => ({
        ...transaction,
        createdAt: new Date(transaction.created_at)
      }));
    } catch (error) {
      console.error('Error fetching cash register transactions:', error);
      return [];
    }
  },

  // Inventory adjustments operations
  async createInventoryAdjustment(adjustmentData: {
    productId: number;
    userId: number;
    adjustmentType: string;
    quantity: number;
    reason: string;
    notes?: string;
    unitCost?: number;
    batchNumber?: string;
    expiryDate?: Date;
    locationFrom?: string;
    locationTo?: string;
    referenceDocument?: string;
  }): Promise<InventoryAdjustment> {
    try {
      const { sqlite } = await import('../db/index.js');

      // Create table if not exists
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS inventory_adjustments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          adjustment_number TEXT NOT NULL UNIQUE,
          product_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          adjustment_type TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          previous_stock INTEGER NOT NULL,
          new_stock INTEGER NOT NULL,
          unit_cost TEXT,
          total_value TEXT,
          reason TEXT NOT NULL,
          notes TEXT,
          batch_number TEXT,
          expiry_date TEXT,
          location_from TEXT,
          location_to TEXT,
          reference_document TEXT,
          approved INTEGER DEFAULT 0,
          approved_by INTEGER,
          approved_at TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products (id),
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (approved_by) REFERENCES users (id)
        )
      `);

      // Get current stock for the product
      const getProduct = sqlite.prepare('SELECT stock_quantity FROM products WHERE id = ?');
      const product = getProduct.get(adjustmentData.productId);
      
      if (!product) {
        throw new Error('Product not found');
      }

      const previousStock = product.stock_quantity || 0;
      const newStock = previousStock + adjustmentData.quantity;

      if (newStock < 0) {
        throw new Error('Insufficient stock for adjustment');
      }

      // Generate adjustment number
      const adjustmentNumber = `ADJ-${Date.now()}`;

      // Calculate total value
      const totalValue = adjustmentData.unitCost 
        ? (Math.abs(adjustmentData.quantity) * adjustmentData.unitCost).toFixed(2)
        : null;

      // Insert adjustment record
      const insertAdjustment = sqlite.prepare(`
        INSERT INTO inventory_adjustments (
          adjustment_number, product_id, user_id, adjustment_type, quantity,
          previous_stock, new_stock, unit_cost, total_value, reason, notes,
          batch_number, expiry_date, location_from, location_to, reference_document
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = insertAdjustment.run(
        adjustmentNumber,
        adjustmentData.productId,
        adjustmentData.userId,
        adjustmentData.adjustmentType,
        adjustmentData.quantity,
        previousStock,
        newStock,
        adjustmentData.unitCost?.toString() || null,
        totalValue,
        adjustmentData.reason,
        adjustmentData.notes || null,
        adjustmentData.batchNumber || null,
        adjustmentData.expiryDate?.toISOString() || null,
        adjustmentData.locationFrom || null,
        adjustmentData.locationTo || null,
        adjustmentData.referenceDocument || null
      );

      // Update product stock
      const updateStock = sqlite.prepare('UPDATE products SET stock_quantity = ? WHERE id = ?');
      updateStock.run(newStock, adjustmentData.productId);

      // Fetch and return the created adjustment
      const getAdjustment = sqlite.prepare(`
        SELECT ia.*, p.name as productName, u.name as userName 
        FROM inventory_adjustments ia
        LEFT JOIN products p ON ia.product_id = p.id
        LEFT JOIN users u ON ia.user_id = u.id
        WHERE ia.id = ?
      `);
      const newAdjustment = getAdjustment.get(result.lastInsertRowid);

      return {
        ...newAdjustment,
        createdAt: new Date(newAdjustment.created_at),
        expiryDate: newAdjustment.expiry_date ? new Date(newAdjustment.expiry_date) : null,
        approvedAt: newAdjustment.approved_at ? new Date(newAdjustment.approved_at) : null
      };
    } catch (error) {
      console.error('Error creating inventory adjustment:', error);
      throw error;
    }
  },

  async getInventoryAdjustments(options: {
    productId?: number;
    userId?: number;
    adjustmentType?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<InventoryAdjustment[]> {
    try {
      const { sqlite } = await import('../db/index.js');
      
      let query = `
        SELECT ia.*, p.name as productName, p.sku as productSku,
               u.name as userName, a.name as approverName
        FROM inventory_adjustments ia
        LEFT JOIN products p ON ia.product_id = p.id
        LEFT JOIN users u ON ia.user_id = u.id
        LEFT JOIN users a ON ia.approved_by = a.id
        WHERE 1=1
      `;
      
      const params: any[] = [];
      
      if (options.productId) {
        query += ' AND ia.product_id = ?';
        params.push(options.productId);
      }
      
      if (options.userId) {
        query += ' AND ia.user_id = ?';
        params.push(options.userId);
      }
      
      if (options.adjustmentType) {
        query += ' AND ia.adjustment_type = ?';
        params.push(options.adjustmentType);
      }
      
      query += ' ORDER BY ia.created_at DESC';
      
      if (options.limit) {
        query += ' LIMIT ?';
        params.push(options.limit);
        
        if (options.offset) {
          query += ' OFFSET ?';
          params.push(options.offset);
        }
      }

      const getAdjustments = sqlite.prepare(query);
      const adjustments = getAdjustments.all(...params);

      return adjustments.map((adjustment: any) => ({
        ...adjustment,
        createdAt: new Date(adjustment.created_at),
        expiryDate: adjustment.expiry_date ? new Date(adjustment.expiry_date) : null,
        approvedAt: adjustment.approved_at ? new Date(adjustment.approved_at) : null
      }));
    } catch (error) {
      console.error('Error fetching inventory adjustments:', error);
      return [];
    }
  },

  async approveInventoryAdjustment(id: number, approvedBy: number): Promise<InventoryAdjustment> {
    try {
      const { sqlite } = await import('../db/index.js');

      const updateAdjustment = sqlite.prepare(`
        UPDATE inventory_adjustments 
        SET approved = 1, approved_by = ?, approved_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const result = updateAdjustment.run(approvedBy, id);

      if (result.changes === 0) {
        throw new Error('Inventory adjustment not found');
      }

      // Fetch and return the updated adjustment
      const getAdjustment = sqlite.prepare(`
        SELECT ia.*, p.name as productName, u.name as userName, a.name as approverName
        FROM inventory_adjustments ia
        LEFT JOIN products p ON ia.product_id = p.id
        LEFT JOIN users u ON ia.user_id = u.id
        LEFT JOIN users a ON ia.approved_by = a.id
        WHERE ia.id = ?
      `);
      const adjustment = getAdjustment.get(id);

      return {
        ...adjustment,
        createdAt: new Date(adjustment.created_at),
        expiryDate: adjustment.expiry_date ? new Date(adjustment.expiry_date) : null,
        approvedAt: adjustment.approved_at ? new Date(adjustment.approved_at) : null
      };
    } catch (error) {
      console.error('Error approving inventory adjustment:', error);
      throw error;
    }
  },

  async deleteInventoryAdjustment(id: number): Promise<boolean> {
    try {
      const { sqlite } = await import('../db/index.js');

      // Get adjustment details to reverse stock changes
      const getAdjustment = sqlite.prepare('SELECT * FROM inventory_adjustments WHERE id = ?');
      const adjustment = getAdjustment.get(id);

      if (!adjustment) {
        return false;
      }

      // Reverse the stock adjustment
      const reverseQuantity = -adjustment.quantity;
      const updateStock = sqlite.prepare(`
        UPDATE products 
        SET stock_quantity = COALESCE(stock_quantity, 0) + ?
        WHERE id = ?
      `);
      updateStock.run(reverseQuantity, adjustment.product_id);

      // Delete the adjustment
      const deleteAdjustment = sqlite.prepare('DELETE FROM inventory_adjustments WHERE id = ?');
      const result = deleteAdjustment.run(id);

      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting inventory adjustment:', error);
      throw error;
    }
  },

  // Expense Categories Operations
  async createExpenseCategory(categoryData: ExpenseCategoryInsert): Promise<ExpenseCategory> {
    const [category] = await db.insert(expenseCategories).values(categoryData).returning();
    return category;
  },

  async getExpenseCategories(): Promise<ExpenseCategory[]> {
    return await db.query.expenseCategories.findMany({
      orderBy: [desc(expenseCategories.name)]
    });
  },

  async updateExpenseCategory(id: number, updates: Partial<ExpenseCategoryInsert>): Promise<ExpenseCategory | null> {
    const [category] = await db.update(expenseCategories)
      .set(updates)
      .where(eq(expenseCategories.id, id))
      .returning();
    return category || null;
  },

  async deleteExpenseCategory(id: number): Promise<boolean> {
    const result = await db.delete(expenseCategories).where(eq(expenseCategories.id, id));
    return result.rowCount > 0;
  },

  // Expense Operations
  async createExpense(expenseData: ExpenseInsert): Promise<Expense> {
    const expenseNumber = `EXP-${Date.now()}`;
    const [expense] = await db.insert(expenses).values({
      ...expenseData,
      expenseNumber,
      expenseDate: expenseData.expenseDate || new Date(),
      updatedAt: new Date()
    }).returning();
    return expense;
  },

  async getExpenses(): Promise<(Expense & { categoryName?: string; supplierName?: string; userName?: string })[]> {
    return await db.query.expenses.findMany({
      with: {
        category: true,
        supplier: true,
        user: true
      },
      orderBy: [desc(expenses.createdAt)]
    });
  },

  async getExpenseById(id: number): Promise<(Expense & { categoryName?: string; supplierName?: string; userName?: string }) | null> {
    return await db.query.expenses.findFirst({
      where: eq(expenses.id, id),
      with: {
        category: true,
        supplier: true,
        user: true
      }
    });
  },

  async updateExpense(id: number, updates: Partial<ExpenseInsert>): Promise<Expense | null> {
    const [expense] = await db.update(expenses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(expenses.id, id))
      .returning();
    return expense || null;
  },

  async deleteExpense(id: number): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id));
    return result.rowCount > 0;
  },

  async getExpensesByDateRange(startDate: Date, endDate: Date): Promise<(Expense & { categoryName?: string; supplierName?: string })[]> {
    return await db.query.expenses.findMany({
      where: and(
        gte(expenses.expenseDate, startDate),
        lte(expenses.expenseDate, endDate)
      ),
      with: {
        category: true,
        supplier: true
      },
      orderBy: [desc(expenses.expenseDate)]
    });
  },

  async getExpensesByCategory(categoryId: number): Promise<Expense[]> {
    return await db.query.expenses.findMany({
      where: eq(expenses.categoryId, categoryId),
      orderBy: [desc(expenses.expenseDate)]
    });
  },

  async getExpensesByStatus(status: string): Promise<Expense[]> {
    return await db.query.expenses.findMany({
      where: eq(expenses.status, status),
      orderBy: [desc(expenses.expenseDate)]
    });
  },

  async getExpenseStats(): Promise<{
    totalExpenses: number;
    pendingExpenses: number;
    paidExpenses: number;
    thisMonthTotal: number;
    lastMonthTotal: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [totalResult] = await db.select({
      total: sql<number>`COALESCE(SUM(CAST(${expenses.amount} AS DECIMAL)), 0)`,
      count: sql<number>`COUNT(*)`
    }).from(expenses);

    const [pendingResult] = await db.select({
      count: sql<number>`COUNT(*)`
    }).from(expenses).where(eq(expenses.status, 'pending'));

    const [paidResult] = await db.select({
      count: sql<number>`COUNT(*)`
    }).from(expenses).where(eq(expenses.status, 'paid'));

    const [thisMonthResult] = await db.select({
      total: sql<number>`COALESCE(SUM(CAST(${expenses.amount} AS DECIMAL)), 0)`
    }).from(expenses).where(gte(expenses.expenseDate, startOfMonth));

    const [lastMonthResult] = await db.select({
      total: sql<number>`COALESCE(SUM(CAST(${expenses.amount} AS DECIMAL)), 0)`
    }).from(expenses).where(
      and(
        gte(expenses.expenseDate, startOfLastMonth),
        lte(expenses.expenseDate, endOfLastMonth)
      )
    );

    return {
      totalExpenses: totalResult.total,
      pendingExpenses: pendingResult.count,
      paidExpenses: paidResult.count,
      thisMonthTotal: thisMonthResult.total,
      lastMonthTotal: lastMonthResult.total
    };
  },

  // Offer Management
  async createOffer(data: OfferInsert): Promise<Offer> {
    try {
      const { sqlite } = await import('../db/index.js');
      
      const result = sqlite.prepare(`
        INSERT INTO offers (
          name, description, offer_type, discount_value, min_purchase_amount,
          max_discount_amount, buy_quantity, get_quantity, category_id,
          product_id, usage_limit, per_customer_limit, date_start, date_end,
          time_start, time_end, points_threshold, points_reward, priority,
          active, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(
        data.name,
        data.description || null,
        data.offerType,
        data.discountValue || 0,
        data.minPurchaseAmount || null,
        data.maxDiscountAmount || null,
        data.buyQuantity || null,
        data.getQuantity || null,
        data.categoryId || null,
        data.productId || null,
        data.usageLimit || null,
        data.perCustomerLimit || null,
        data.dateStart || null,
        data.dateEnd || null,
        data.timeStart || null,
        data.timeEnd || null,
        data.pointsThreshold || null,
        data.pointsReward || null,
        data.priority || 0,
        data.active !== false ? 1 : 0,
        data.createdBy
      );

      // Fetch the created offer
      const offer = sqlite.prepare('SELECT * FROM offers WHERE id = ?').get(result.lastInsertRowid);
      return {
        ...offer,
        active: Boolean(offer.active),
        createdAt: new Date(offer.created_at),
        updatedAt: new Date(offer.updated_at)
      };
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  },

  async getOfferById(id: number): Promise<Offer | null> {
    try {
      const { sqlite } = await import('../db/index.js');
      
      const offer = sqlite.prepare(`
        SELECT o.*, u.name as creatorName
        FROM offers o
        LEFT JOIN users u ON o.created_by = u.id
        WHERE o.id = ?
      `).get(id);

      if (!offer) return null;

      return {
        ...offer,
        active: Boolean(offer.active),
        createdAt: new Date(offer.created_at),
        updatedAt: new Date(offer.updated_at)
      };
    } catch (error) {
      console.error('Error fetching offer:', error);
      return null;
    }
  },

  async listOffers(filters?: {
    active?: boolean;
    offerType?: string;
    limit?: number;
  }): Promise<Offer[]> {
    try {
      // Use direct SQLite query to avoid schema issues
      const { sqlite } = await import('../db/index.js');
      
      let query = `
        SELECT o.*, u.name as creatorName
        FROM offers o
        LEFT JOIN users u ON o.created_by = u.id
        WHERE 1=1
      `;
      const params = [];

      if (filters?.active !== undefined) {
        query += ` AND o.active = ?`;
        params.push(filters.active ? 1 : 0);
      }
      
      if (filters?.offerType) {
        query += ` AND o.offer_type = ?`;
        params.push(filters.offerType);
      }

      query += ` ORDER BY o.priority DESC, o.created_at DESC`;
      
      if (filters?.limit) {
        query += ` LIMIT ?`;
        params.push(filters.limit);
      } else {
        query += ` LIMIT 50`;
      }

      const offers = sqlite.prepare(query).all(...params);
      return offers.map(offer => ({
        ...offer,
        active: Boolean(offer.active),
        createdAt: new Date(offer.created_at),
        updatedAt: new Date(offer.updated_at)
      }));
    } catch (error) {
      console.error('Error listing offers:', error);
      return [];
    }
  },

  async updateOffer(id: number, data: Partial<OfferInsert>): Promise<Offer | null> {
    const [updatedOffer] = await db
      .update(offers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(offers.id, id))
      .returning();
    return updatedOffer || null;
  },

  async deleteOffer(id: number): Promise<boolean> {
    try {
      const { sqlite } = await import('../db/index.js');
      const result = sqlite.prepare('DELETE FROM offers WHERE id = ?').run(id);
      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting offer:', error);
      return false;
    }
  },

  async getActiveOffers(): Promise<Offer[]> {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    return await db.query.offers.findMany({
      where: and(
        eq(offers.active, true),
        or(
          eq(offers.validFrom, null),
          lte(offers.validFrom, now)
        ),
        or(
          eq(offers.validTo, null),
          gte(offers.validTo, now)
        )
      ),
      orderBy: [desc(offers.priority)],
      with: {
        freeProduct: true
      }
    });
  },

  async applyOfferToSale(offerId: number, saleId: number, customerId: number | null, discountAmount: number, originalAmount: number, finalAmount: number, pointsEarned?: number): Promise<OfferUsage> {
    const [usage] = await db.insert(offerUsage).values({
      offerId,
      saleId,
      customerId,
      discountAmount: discountAmount.toString(),
      originalAmount: originalAmount.toString(),
      finalAmount: finalAmount.toString(),
      pointsEarned: pointsEarned?.toString() || '0'
    }).returning();

    // Update offer usage count
    await db
      .update(offers)
      .set({ 
        usageCount: sql`${offers.usageCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(offers.id, offerId));

    return usage;
  },

  async getOfferUsageStats(offerId: number): Promise<{
    totalUsage: number;
    totalDiscount: number;
    totalRevenue: number;
    avgDiscount: number;
  }> {
    const [stats] = await db
      .select({
        totalUsage: sql<number>`COUNT(*)`,
        totalDiscount: sql<number>`COALESCE(SUM(CAST(${offerUsage.discountAmount} AS DECIMAL)), 0)`,
        totalRevenue: sql<number>`COALESCE(SUM(CAST(${offerUsage.finalAmount} AS DECIMAL)), 0)`,
        avgDiscount: sql<number>`COALESCE(AVG(CAST(${offerUsage.discountAmount} AS DECIMAL)), 0)`
      })
      .from(offerUsage)
      .where(eq(offerUsage.offerId, offerId));

    return {
      totalUsage: stats.totalUsage,
      totalDiscount: stats.totalDiscount,
      totalRevenue: stats.totalRevenue,
      avgDiscount: stats.avgDiscount
    };
  },

  async getOfferUsageHistory(offerId: number, limit: number = 20): Promise<OfferUsage[]> {
    return await db.query.offerUsage.findMany({
      where: eq(offerUsage.offerId, offerId),
      orderBy: [desc(offerUsage.usedAt)],
      limit,
      with: {
        offer: true,
        sale: true,
        customer: true
      }
    });
  },

  // Customer Loyalty Management
  async getCustomerLoyalty(customerId: number): Promise<CustomerLoyalty | null> {
    const loyalty = await db.query.customerLoyalty.findFirst({
      where: eq(customerLoyalty.customerId, customerId)
    });
    return loyalty || null;
  },

  async createCustomerLoyalty(customerId: number): Promise<CustomerLoyalty> {
    const [loyalty] = await db.insert(customerLoyalty).values({
      customerId,
      totalPoints: '0',
      usedPoints: '0',
      availablePoints: '0'
    }).returning();
    return loyalty;
  },

  async updateCustomerLoyalty(customerId: number, pointsToAdd: number): Promise<CustomerLoyalty | null> {
    let loyalty = await this.getCustomerLoyalty(customerId);
    
    if (!loyalty) {
      loyalty = await this.createCustomerLoyalty(customerId);
    }

    const currentTotal = parseFloat(loyalty.totalPoints.toString());
    const currentAvailable = parseFloat(loyalty.availablePoints.toString());
    const newTotal = currentTotal + pointsToAdd;
    const newAvailable = currentAvailable + pointsToAdd;

    const [updated] = await db
      .update(customerLoyalty)
      .set({
        totalPoints: newTotal.toString(),
        availablePoints: newAvailable.toString(),
        lastUpdated: new Date()
      })
      .where(eq(customerLoyalty.customerId, customerId))
      .returning();

    return updated;
  },

  async redeemLoyaltyPoints(customerId: number, pointsToRedeem: number): Promise<CustomerLoyalty | null> {
    const loyalty = await this.getCustomerLoyalty(customerId);
    if (!loyalty) return null;

    const availablePoints = parseFloat(loyalty.availablePoints.toString());
    if (availablePoints < pointsToRedeem) {
      throw new Error('Insufficient loyalty points');
    }

    const newUsed = parseFloat(loyalty.usedPoints.toString()) + pointsToRedeem;
    const newAvailable = availablePoints - pointsToRedeem;

    const [updated] = await db
      .update(customerLoyalty)
      .set({
        usedPoints: newUsed.toString(),
        availablePoints: newAvailable.toString(),
        lastUpdated: new Date()
      })
      .where(eq(customerLoyalty.customerId, customerId))
      .returning();

    return updated;
  },

  async calculateOfferDiscount(offer: Offer, cartItems: any[], cartTotal: number, customerId?: number): Promise<{
    applicable: boolean;
    discountAmount: number;
    reason?: string;
    freeItems?: any[];
    pointsEarned?: number;
  }> {
    // Check if offer is valid by time
    const now = new Date();
    if (offer.validFrom && offer.validFrom > now) {
      return { applicable: false, discountAmount: 0, reason: 'Offer not yet valid' };
    }
    if (offer.validTo && offer.validTo < now) {
      return { applicable: false, discountAmount: 0, reason: 'Offer has expired' };
    }

    // Check time-based offers
    if (offer.timeStart && offer.timeEnd) {
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      if (currentTime < offer.timeStart || currentTime > offer.timeEnd) {
        return { applicable: false, discountAmount: 0, reason: 'Offer not valid at this time' };
      }
    }

    // Check minimum purchase amount
    const minAmount = parseFloat(offer.minPurchaseAmount?.toString() || '0');
    if (cartTotal < minAmount) {
      return { applicable: false, discountAmount: 0, reason: `Minimum purchase amount ₹${minAmount} required` };
    }

    // Check usage limits
    if (offer.usageLimit && offer.usageCount >= offer.usageLimit) {
      return { applicable: false, discountAmount: 0, reason: 'Offer usage limit reached' };
    }

    let discountAmount = 0;
    let freeItems: any[] = [];
    let pointsEarned = 0;

    switch (offer.offerType) {
      case 'percentage':
        discountAmount = (cartTotal * parseFloat(offer.discountValue.toString())) / 100;
        const maxDiscount = parseFloat(offer.maxDiscountAmount?.toString() || '0');
        if (maxDiscount > 0 && discountAmount > maxDiscount) {
          discountAmount = maxDiscount;
        }
        break;

      case 'flat_amount':
        discountAmount = parseFloat(offer.discountValue.toString());
        if (discountAmount > cartTotal) {
          discountAmount = cartTotal;
        }
        break;

      case 'buy_x_get_y':
        if (offer.buyQuantity && offer.getQuantity) {
          const eligibleItems = cartItems.filter(item => {
            if (offer.applicableProducts) {
              const applicableProducts = JSON.parse(offer.applicableProducts);
              return applicableProducts.includes(item.productId);
            }
            return true;
          });

          const totalEligibleQty = eligibleItems.reduce((sum, item) => sum + item.quantity, 0);
          const freeQty = Math.floor(totalEligibleQty / offer.buyQuantity) * offer.getQuantity;

          if (freeQty > 0) {
            // Find lowest priced items for free
            const sortedItems = eligibleItems.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
            let remainingFreeQty = freeQty;
            
            for (const item of sortedItems) {
              if (remainingFreeQty <= 0) break;
              const freeFromThisItem = Math.min(remainingFreeQty, item.quantity);
              freeItems.push({
                ...item,
                quantity: freeFromThisItem,
                discountAmount: freeFromThisItem * parseFloat(item.price)
              });
              discountAmount += freeFromThisItem * parseFloat(item.price);
              remainingFreeQty -= freeFromThisItem;
            }
          }
        }
        break;

      case 'loyalty_points':
        const threshold = parseFloat(offer.pointsThreshold?.toString() || '1000');
        const reward = parseFloat(offer.pointsReward?.toString() || '10');
        if (cartTotal >= threshold) {
          pointsEarned = Math.floor(cartTotal / threshold) * reward;
        }
        break;

      case 'category_based':
        if (offer.applicableCategories) {
          const applicableCategories = JSON.parse(offer.applicableCategories);
          const eligibleItems = cartItems.filter(item => 
            applicableCategories.includes(item.categoryId)
          );
          const eligibleTotal = eligibleItems.reduce((sum, item) => 
            sum + (parseFloat(item.price) * item.quantity), 0
          );
          discountAmount = (eligibleTotal * parseFloat(offer.discountValue.toString())) / 100;
        }
        break;
    }

    return {
      applicable: discountAmount > 0 || pointsEarned > 0,
      discountAmount,
      freeItems,
      pointsEarned
    };
  },

  // Get product by barcode for POS scanning
  async getProductByBarcode(barcode: string) {
    try {
      const result = await db
        .select()
        .from(schema.products)
        .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
        .where(eq(schema.products.barcode, barcode))
        .limit(1);

      if (result.length === 0) return null;

      const { products: product, categories: category } = result[0];
      
      return {
        ...product,
        category: category ? { name: category.name } : null
      };
    } catch (error) {
      console.error('Error getting product by barcode:', error);
      throw error;
    }
  },

  // Get applicable offers for a specific product and customer
  async getApplicableOffers(productId: number, customerId?: number) {
    try {
      const now = new Date();
      
      let query = db
        .select()
        .from(schema.offers)
        .where(
          and(
            eq(schema.offers.active, true),
            lte(schema.offers.validFrom, now),
            gte(schema.offers.validTo, now)
          )
        );

      const allOffers = await query;
      
      // Filter offers that apply to this product
      const applicableOffers = allOffers.filter(offer => {
        // Check product-specific offers
        if (offer.applicableProducts) {
          const applicableProducts = JSON.parse(offer.applicableProducts);
          if (applicableProducts.includes(productId)) {
            return true;
          }
        }
        
        // Check customer-specific offers
        if (customerId && offer.applicableCustomers) {
          const applicableCustomers = JSON.parse(offer.applicableCustomers);
          if (applicableCustomers.includes(customerId)) {
            return true;
          }
        }
        
        // Check general offers (no specific products/customers)
        if (!offer.applicableProducts && !offer.applicableCustomers) {
          return true;
        }
        
        return false;
      });

      return applicableOffers;
    } catch (error) {
      console.error('Error getting applicable offers:', error);
      return [];
    }
  }
};