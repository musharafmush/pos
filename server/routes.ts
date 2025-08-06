import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { z } from "zod";
import * as schema from "../shared/schema.js";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { db } from "../db/index.js";
import { eq, desc, sql, and, gte, lte, inArray } from "drizzle-orm";
import { returns as returnTransactions, sales, returnItems, products, customers, purchases, purchaseItems, suppliers, categories } from "../shared/schema.js";

// Define authentication middleware
const isAuthenticated = (req: any, res: any, next: any) => {
  console.log('Authentication check:', {
    isAuth: req.isAuthenticated(),
    user: req.user,
    session: req.session?.passport
  });

  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Not authenticated" });
};

// Define role-based middleware
const hasRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    }

    return next();
  };
};

const isAdmin = hasRole(['admin']);
const isAdminOrManager = hasRole(['admin', 'manager']);

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);

  // Configure session storage for desktop SQLite mode
  // Use memory store for desktop app - perfect for offline use

  // Configure sessions
  app.use(session({
    secret: process.env.SESSION_SECRET || 'POSAPPSECRET',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
  }));

  // Configure passport
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy(
    {
      usernameField: 'usernameOrEmail',
      passwordField: 'password'
    },
    async (usernameOrEmail, password, done) => {
      try {
        console.log('Login attempt with:', usernameOrEmail);

        // Find user by either username or email
        const user = await storage.getUserByUsernameOrEmail(usernameOrEmail);

        if (!user) {
          console.log('User not found for:', usernameOrEmail);
          return done(null, false, { message: 'Invalid credentials. Please check your username/email and password.' });
        }

        console.log('User found:', user.id, user.email);

        // Check if user is active
        if (!user.active) {
          return done(null, false, { message: 'Account is disabled. Please contact an administrator.' });
        }

        // Verify password
        try {
          console.log('Attempting password verification');
          const isValidPassword = await bcrypt.compare(password, user.password);
          console.log('Password validation result:', isValidPassword);

          if (!isValidPassword) {
            console.log('Password verification failed');
            return done(null, false, { message: 'Invalid credentials. Please check your username/email and password.' });
          }

          console.log('Authentication successful, user logged in');
          return done(null, user);
        } catch (error) {
          console.error('Password verification error:', error);
          return done(null, false, { message: 'Authentication error. Please try again.' });
        }
      } catch (error) {
        console.error('Login error:', error);
        return done(error);
      }
    }
  ));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Authentication routes
  app.post('/api/auth/login', (req, res, next) => {
    console.log('Login request received:', req.body.usernameOrEmail);

    passport.authenticate('local', (err: Error | null, user: any, info: { message: string } | undefined) => {
      if (err) {
        console.error('Login error:', err);
        return res.status(500).json({ message: 'Internal server error during login' });
      }

      if (!user) {
        console.log('Authentication failed:', info?.message);
        return res.status(401).json({ message: info?.message || 'Invalid username or password' });
      }

      console.log('Authentication successful for user:', user.id);

      // Log the user in
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error('Session login error:', loginErr);
          return res.status(500).json({ message: 'Error establishing session' });
        }

        console.log('Session created successfully');

        // Remove password from response
        const userResponse = { ...user };
        if (userResponse.password) delete userResponse.password;

        return res.json({ user: userResponse });
      });
    })(req, res, next);
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      // Validate user data with more specific error messages
      try {
        const userData = schema.userInsertSchema.parse(req.body);

        // If username is provided, check if it already exists
        if (userData.username) {
          const existingUsername = await storage.getUserByUsername(userData.username);
          if (existingUsername) {
            return res.status(400).json({ message: 'Username already exists' });
          }
        }

        // Always check if email already exists since it's required now
        const existingEmail = await storage.getUserByEmail(userData.email);
        if (existingEmail) {
          return res.status(400).json({ message: 'Email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        // Set default values for new user
        const userToCreate = {
          ...userData,
          password: hashedPassword,
          role: userData.role || 'cashier', // Default role
          active: true, // Account active by default
          image: userData.image || null
        };

        // Create user
        const newUser = await storage.createUser(userToCreate);

        // Auto login after registration
        req.login(newUser, (err) => {
          if (err) {
            console.error('Error logging in after registration:', err);
            return res.status(500).json({ message: 'Account created but error logging in automatically. Please login manually.' });
          }

          // Remove password from response
          const userResponse = { ...newUser };
          if (userResponse.password) {
            delete userResponse.password;
          }

          res.status(201).json({ user: userResponse });
        });
      } catch (zodError) {
        if (zodError instanceof z.ZodError) {
          // Format validation errors for better readability
          const formattedErrors = zodError.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }));
          return res.status(400).json({ 
            message: 'Validation failed',
            errors: formattedErrors 
          });
        }
        throw zodError; // Re-throw if not a ZodError
      }
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).json({ message: 'Internal server error during registration' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Error logging out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get('/api/auth/user', (req, res) => {
    console.log('User session check');

    if (!req.isAuthenticated() || !req.user) {
      console.log('User not authenticated');
      return res.status(401).json({ message: "Not authenticated" });
    }

    console.log('User authenticated:', req.user.id);
    const user = { ...req.user as any };

    // Safety check to ensure password is never sent to client
    if (user.password) {
      delete user.password;
    }

    res.json({ user });
  });

  // Password reset endpoint for fixing login issues
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { username, newPassword } = req.body;

      if (!username || !newPassword) {
        return res.status(400).json({ message: 'Username and new password are required' });
      }

      const user = await storage.getUserByUsernameOrEmail(username);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update the user with the new password (updateUser will hash it)
      await storage.updateUser(user.id, { password: newPassword });

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Categories API
  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await storage.listCategories();
      res.json(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/categories/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const category = await storage.getCategoryById(id);

      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      res.json(category);
    } catch (error) {
      console.error('Error fetching category:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/categories', isAuthenticated, async (req, res) => {
    try {
      const categoryData = schema.categoryInsertSchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating category:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/categories/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const categoryData = schema.categoryInsertSchema.parse(req.body);
      const category = await storage.updateCategory(id, categoryData);

      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error updating category:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/categories/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteCategory(id);

      if (!deleted) {
        return res.status(404).json({ message: 'Category not found' });
      }

      res.json({ message: 'Category deleted successfully' });
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Products API
  app.get('/api/products', async (req, res) => {
    try {
      console.log('📦 Products API endpoint called');

      // Fallback to storage method
      const products = await storage.listProducts();
      console.log(`✅ Storage method returned ${products.length} products`);
      res.json(products);
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      res.status(500).json({ 
        message: 'Failed to fetch products',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.get('/api/products/search', async (req, res) => {
    try {
      const term = req.query.q as string || '';
      const products = await storage.searchProducts(term);
      res.json(products);
    } catch (error) {
      console.error('Error searching products:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/products/low-stock', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string || '10');
      const products = await storage.getLowStockProducts(limit);
      res.json(products);
    } catch (error) {
      console.error('Error fetching low stock products:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Purchase recommendations API
  app.get('/api/purchase-recommendations', isAuthenticated, async (req, res) => {
    try {
      const recommendations = await storage.getRecommendedPurchaseItems();
      res.json(recommendations);
    } catch (error) {
      console.error('Error generating purchase recommendations:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/products/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log('🔍 Fetching individual product with ID:', id);

      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ 
          message: 'Invalid product ID',
          error: 'Product ID must be a valid positive number' 
        });
      }

      // Try storage method first
      try {
        const product = await storage.getProductById(id);

        if (!product) {
          console.log('❌ Product not found with ID:', id);
          return res.status(404).json({ 
            message: 'Product not found',
            error: `No product exists with ID ${id}`
          });
        }

        console.log('✅ Product found:', product.name);
        res.json(product);
        return;
      } catch (storageError) {
        console.log('⚠️ Storage method failed, trying direct query:', storageError.message);
      }

      // Fallback to direct SQLite query
      const { sqlite } = await import('../db/index.js');

      const productQuery = sqlite.prepare(`
        SELECT 
          p.*,
          c.name as categoryName 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        WHERE p.id = ?
      `);

      const product = productQuery.get(id);

      if (!product) {
        console.log('❌ Product not found in direct query with ID:', id);
        return res.status(404).json({ 
          message: 'Product not found',
          error: `No product exists with ID ${id}`
        });
      }

      // Format the product response to match expected structure
      const formattedProduct = {
        id: product.id,
        name: product.name,
        description: product.description || '',
        sku: product.sku,
        price: product.price,
        mrp: product.mrp || product.price,
        cost: product.cost || '0',
        weight: product.weight,
        weightUnit: product.weight_unit || 'kg',
        categoryId: product.category_id,
        stockQuantity: product.stock_quantity || 0,
        alertThreshold: product.alert_threshold || 5,
        barcode: product.barcode || '',
        image: product.image || '',
        hsnCode: product.hsn_code || '',
        cgstRate: product.cgst_rate || '0',
        sgstRate: product.sgst_rate || '0',
        igstRate: product.igst_rate || '0',
        cessRate: product.cess_rate || '0',
        taxCalculationMethod: product.tax_calculation_method || 'exclusive',
        active: Boolean(product.active),
        createdAt: new Date(product.created_at),
        updatedAt: new Date(product.updated_at),
        category: {
          id: product.category_id,
          name: product.categoryName || 'Uncategorized'
        }
      };

      console.log('✅ Product found via direct query:', formattedProduct.name);
      res.json(formattedProduct);

    } catch (error) {
      console.error('❌ Error fetching product:', error);
      res.status(500).json({ 
        message: 'Internal server error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.post('/api/products', isAuthenticated, async (req, res) => {
    try {
      console.log('Product creation request body:', req.body);

      // Enhanced comprehensive product data handling
      const requestData = {
        ...req.body,
        // Basic Information
        name: req.body.name || req.body.itemName || '',
        sku: req.body.sku || req.body.itemCode || '',
        description: req.body.description || req.body.aboutProduct || '',
        mrp: req.body.mrp || req.body.price || '0',
        cost: req.body.cost || '0',
        price: req.body.price || '0',
        weight: req.body.weight || req.body.weightInGms || null,
        weightUnit: req.body.weightUnit || 'kg',
        stockQuantity: parseInt(req.body.stockQuantity) || 0,
        alertThreshold: parseInt(req.body.alertThreshold) || 5,
        categoryId: parseInt(req.body.categoryId) || 1,
        active: req.body.active !== false,
        barcode: req.body.barcode || req.body.eanCode || '',

        // Tax Information - Enhanced GST compliance
        hsnCode: req.body.hsnCode || '',
        gstCode: req.body.gstCode || 'GST 18%',
        cgstRate: String(req.body.cgstRate || '0'),
        sgstRate: String(req.body.sgstRate || '0'),
        igstRate: String(req.body.igstRate || '0'),
        cessRate: String(req.body.cessRate || '0'),
        taxCalculationMethod: req.body.taxCalculationMethod || 'exclusive',
        gstUom: req.body.gstUom || 'PIECES',
        purchaseGstCalculatedOn: req.body.purchaseGstCalculatedOn || 'MRP',
        purchaseAbatement: req.body.purchaseAbatement || '',
        configItemWithCommodity: req.body.configItemWithCommodity || false,
        seniorExemptApplicable: req.body.seniorExemptApplicable || false,

        // Supplier & Manufacturer Information
        manufacturerName: req.body.manufacturerName || '',
        supplierName: req.body.supplierName || '',
        manufacturerId: req.body.manufacturerId || null,
        supplierId: req.body.supplierId || null,

        // Product Classification
        alias: req.body.alias || '',
        itemProductType: req.body.itemProductType || 'Standard',
        department: req.body.department || '',
        brand: req.body.brand || '',
        buyer: req.body.buyer || '',
        purchaseGstCalculatedOn: req.body.purchaseGstCalculatedOn || 'MRP',
        gstUom: req.body.gstUom || 'PIECES',
        purchaseAbatement: req.body.purchaseAbatement || '',

        // Configuration Options
        configItemWithCommodity: req.body.configItemWithCommodity || false,
        seniorExemptApplicable: req.body.seniorExemptApplicable || false,
        eanCodeRequired: req.body.eanCodeRequired || false,
        weightsPerUnit: req.body.weightsPerUnit || '1',
        batchExpiryDetails: req.body.batchExpiryDetails || 'Not Required',
        itemPreparationsStatus: req.body.itemPreparationsStatus || 'Trade As Is',

        // Pricing & Charges
        grindingCharge: req.body.grindingCharge || '',
        weightInGms: req.body.weightInGms || '',
        bulkItemName: req.body.bulkItemName || '',
        repackageUnits: req.body.repackageUnits || '',
        repackageType: req.body.repackageType || '',
        packagingMaterial: req.body.packagingMaterial || '',
        decimalPoint: req.body.decimalPoint || '0',
        productType: req.body.productType || 'NA',
        sellBy: req.body.sellBy || 'None',
        itemPerUnit: req.body.itemPerUnit || '1',
        maintainSellingMrpBy: req.body.maintainSellingMrpBy || 'Multiple Selling Price & Multiple MRP',
        batchSelection: req.body.batchSelection || 'Not Applicable',

        // Item Properties
        isWeighable: req.body.isWeighable || false,
        skuType: req.body.skuType || 'Put Away',
        indentType: req.body.indentType || 'Manual',
        gateKeeperMargin: req.body.gateKeeperMargin || '',
        allowItemFree: req.body.allowItemFree || false,
        showOnMobileDashboard: req.body.showOnMobileDashboard || false,
        enableMobileNotifications: req.body.enableMobileNotifications || false,
        quickAddToCart: req.body.quickAddToCart || false,
        perishableItem: req.body.perishableItem || false,
        temperatureControlled: req.body.temperatureControlled || false,
        fragileItem: req.body.fragileItem || false,
        trackSerialNumbers: req.body.trackSerialNumbers || false,
        fdaApproved: req.body.fdaApproved || false,
        bisCertified: req.body.bisCertified || false,
        organicCertified: req.body.organicCertified || false,
        itemIngredients: req.body.itemIngredients || ''
      };

      console.log('Processed product data:', requestData);

      // Validate required fields
      if (!requestData.name) {
        return res.status(400).json({ 
          message: 'Product name is required' 
        });
      }

      if (!requestData.sku) {
        return res.status(400).json({ 
          message: 'Product SKU/Item Code is required' 
        });
      }

      if (!requestData.price || requestData.price === '0') {
        return res.status(400).json({ 
          message: 'Product price is required and must be greater than 0' 
        });
      }

      if (!requestData.categoryId) {
        return res.status(400).json({ 
          message: 'Category is required' 
        });
      }

      // Check if SKU already exists
      try {
        const existingProduct = await storage.getProductBySku(requestData.sku);
        if (existingProduct) {
          return res.status(400).json({
            message: 'A product with this SKU/Item Code already exists'
          });
        }
      } catch (skuCheckError) {
        console.error('Error checking SKU:', skuCheckError);
        // Continue with creation if SKU check fails
      }

      const productData = schema.productInsertSchema.parse(requestData);
      console.log('Validated product data:', productData);

      const product = await storage.createProduct(productData);
      console.log('Created product successfully:', product.id);

      res.status(201).json({
        ...product,
        message: 'Product created successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Validation errors:', JSON.stringify(error.errors, null, 2));
        const detailedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          received: err.received,
          expected: err.expected
        }));
        console.error('Detailed validation errors:', detailedErrors);
        return res.status(400).json({ 
          message: 'Validation failed',
          errors: error.errors, 
          details: detailedErrors 
        });
      }
      console.error('Error creating product:', error);
      res.status(500).json({ 
        message: 'Failed to create product',
        error: error.message 
      });
    }
  });

  app.put('/api/products/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log('Product update request for ID:', id, 'Data:', req.body);

      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: 'Invalid product ID' });
      }

      // For updates, we allow partial data, so don't use strict schema validation
      const productData = req.body;

      const product = await storage.updateProduct(id, productData);

      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      console.log('Product updated successfully:', product.id);
      res.json({
        ...product,
        message: 'Product updated successfully'
      });
    } catch (error) {
      console.error('Error updating product:', error);

      // Provide more specific error messages
      let errorMessage = 'Internal server error';
      if (error.message) {
        errorMessage = error.message;
      }

      res.status(500).json({ 
        message: errorMessage,
        error: 'Failed to update product'
      });
    }
  });

  app.patch('/api/products/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const productData = req.body; // For PATCH, we accept partial updates
      console.log('PATCH request received for product:', id, 'with data:', productData);

      const product = await storage.updateProduct(id, productData);

      if (!product) {
        console.log('Product not found for ID:', id);
        return res.status(404).json({ message: 'Product not found' });
      }

      console.log('Product updated successfully:', product);
      res.json(product);
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Check product references before deletion
  app.get('/api/products/:id/references', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const references = await storage.checkProductReferences(id);
      res.json(references);
    } catch (error) {
      console.error('Error checking product references:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/products/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const force = req.query.force === 'true';

      // Check if product exists first
      const product = await storage.getProductById(id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Attempt deletion
      try {
        const deleted = await storage.deleteProduct(id, force);

        if (!deleted) {
          return res.status(404).json({ message: 'Product not found' });
        }

        res.json({ 
          message: force 
            ? 'Product and all related records deleted successfully' 
            : 'Product deleted successfully' 
        });
      } catch (deleteError: any) {
        console.error('Delete error:', deleteError);

        if (deleteError.message === 'CONSTRAINT_ERROR' || deleteError.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
          const references = await storage.checkProductReferences(id);
          return res.status(400).json({ 
            message: 'Cannot delete product. This product is referenced in purchases, sales, or other records.',
            references: {
              saleItems: references.saleItems,
              purchaseItems: references.purchaseItems
            },
            canForceDelete: true
          });
        }

        throw deleteError;
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Data backup and management endpoints
  app.post('/api/backup/create', async (req, res) => {
    try {
      console.log('🔄 Creating comprehensive data backup...');

      const { sqlite } = await import('../db/index.js');

      // Helper function to safely query tables
      const safeTableQuery = (tableName: string) => {
        try {
          // First check if table exists
          const tableExists = sqlite.prepare(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name=?
          `).get(tableName);

          if (!tableExists) {
            console.log(`⚠️ Table ${tableName} does not exist, skipping...`);
            return [];
          }

          const data = sqlite.prepare(`SELECT * FROM ${tableName}`).all();
          console.log(`✅ Backed up ${data.length} records from ${tableName}`);
          return data;
        } catch (error) {
          console.error(`❌ Error backing up ${tableName}:`, error.message);
          return [];
        }
      };

      // Create comprehensive backup data structure
      const backupData = {
        timestamp: new Date().toISOString(),
        version: '2.0',
        source: 'Awesome Shop POS',
        data: {
          // Core system data
          users: safeTableQuery('users'),
          categories: safeTableQuery('categories'),
          suppliers: safeTableQuery('suppliers'),
          customers: safeTableQuery('customers'),
          products: safeTableQuery('products'),

          // Transaction data
          sales: safeTableQuery('sales'),
          sale_items: safeTableQuery('sale_items'),
          purchases: safeTableQuery('purchases'),
          purchase_items: safeTableQuery('purchase_items'),

          // System configuration
          settings: safeTableQuery('settings'),

          // Additional tables if they exist
          returns: safeTableQuery('returns'),
          return_items: safeTableQuery('return_items'),
          inventory_adjustments: safeTableQuery('inventory_adjustments'),
          payment_methods: safeTableQuery('payment_methods'),
          discount_rules: safeTableQuery('discount_rules'),
          tax_rates: safeTableQuery('tax_rates')
        },
        metadata: {
          created_at: new Date().toISOString(),
          total_tables: 0,
          total_records: 0,
          database_size: 0
        }
      };

      // Calculate metadata
      let totalRecords = 0;
      let totalTables = 0;

      Object.keys(backupData.data).forEach(table => {
        const records = backupData.data[table];
        if (Array.isArray(records) && records.length > 0) {
          totalRecords += records.length;
          totalTables++;
        }
      });

      backupData.metadata.total_tables = totalTables;
      backupData.metadata.total_records = totalRecords;

      // Get database file size if possible
      try {
        const fs = require('fs');
        const path = require('path');
        const dbPath = path.join(process.cwd(), 'pos-data.db');
        if (fs.existsSync(dbPath)) {
          const stats = fs.statSync(dbPath);
          backupData.metadata.database_size = stats.size;
        }
      } catch (sizeError) {
        console.log('⚠️ Could not determine database size:', sizeError.message);
      }

      // Store backup temporarily for download
      const backupJson = JSON.stringify(backupData, null, 2);
      global.latestBackup = backupJson;

      console.log('✅ Comprehensive backup created successfully');
      console.log(`📊 Backup summary: ${totalTables} tables, ${totalRecords} records`);

      res.json({ 
        success: true, 
        message: 'Complete backup created successfully',
        timestamp: backupData.timestamp,
        summary: {
          tables: totalTables,
          records: totalRecords,
          size: Math.round(backupJson.length / 1024) + ' KB'
        }
      });

    } catch (error) {
      console.error('❌ Error creating backup:', error);
      res.status(500).json({ 
        error: 'Failed to create backup',
        message: error.message,
        details: 'Please check server logs for more information'
      });
    }
  });

  app.get('/api/backup/download', async (req, res) => {
    try {
      if (!global.latestBackup) {
        return res.status(404).json({ 
          error: 'No backup available for download',
          message: 'Please create a backup first before downloading'
        });
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `awesome-pos-backup-${timestamp}.json`;

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', Buffer.byteLength(global.latestBackup, 'utf8'));
      res.send(global.latestBackup);

      console.log(`✅ Backup downloaded successfully: ${filename}`);

      // Clear the backup from memory after download
      global.latestBackup = null;

    } catch (error) {
      console.error('❌ Error downloading backup:', error);
      res.status(500).json({ 
        error: 'Failed to download backup',
        message: error.message 
      });
    }
  });

  app.post('/api/backup/restore', async (req, res) => {
    try {
      console.log('🔄 Starting backup restore process...');

      let backupData;

      // Parse and validate backup data with enhanced error handling
      try {
        // Check if we have backup data
        if (!req.body.backup) {
          return res.status(400).json({ 
            error: 'No backup data provided',
            message: 'Please select a valid backup file to restore'
          });
        }

        // Handle different input formats with size limits
        if (typeof req.body.backup === 'string') {
          console.log('📄 Processing string backup data...');

          // Check size limit (reduce to 10MB to prevent memory issues)
          if (req.body.backup.length > 10 * 1024 * 1024) {
            return res.status(413).json({ 
              error: 'Backup file too large',
              message: 'Backup file exceeds 10MB limit. Please use a smaller backup file or compress the data.'
            });
          }

          try {
            backupData = JSON.parse(req.body.backup);
          } catch (jsonError) {
            console.error('❌ JSON parsing failed:', jsonError.message);
            return res.status(400).json({ 
              error: 'Invalid JSON format',
              message: 'The backup file contains invalid JSON data. Please check the file format.'
            });
          }
        } else if (typeof req.body.backup === 'object') {
          console.log('📄 Processing object backup data...');
          backupData = req.body.backup;
        } else {
          return res.status(400).json({ 
            error: 'Invalid backup format',
            message: 'Backup data must be in JSON format'
          });
        }

        // Validate backup structure
        if (!backupData || typeof backupData !== 'object') {
          return res.status(400).json({ 
            error: 'Invalid backup data format',
            message: 'Backup file structure is not valid'
          });
        }

        if (!backupData.data) {
          return res.status(400).json({ 
            error: 'Invalid backup file',
            message: 'Backup file is missing data section'
          });
        }

        console.log('📦 Backup validation passed, starting restore...');
        console.log('📊 Backup contains:', Object.keys(backupData.data || {}));

      } catch (parseError) {
        console.error('❌ Error parsing backup data:', parseError);
        return res.status(400).json({ 
          error: 'Failed to process backup file',
          message: parseError.message || 'Unable to parse backup data'
        });
      }

      const { sqlite } = await import('../db/index.js');

      // Check database connection with retry mechanism
      try {
        let retries = 3;
        while (retries > 0) {
          try {
            sqlite.prepare('SELECT 1').get();
            break;
          } catch (dbError) {
            retries--;
            if (retries === 0) throw dbError;
            console.log(`Database connection failed, retrying... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        console.log('✅ Database connection verified');
      } catch (dbError) {
        console.error('❌ Database connection failed:', dbError);
        return res.status(500).json({ 
          error: 'Database connection failed',
          message: 'Unable to connect to database. Please try again later.'
        });
      }

      // Enhanced transaction with schema validation
      try {
        const restoreTransaction = sqlite.transaction(() => {
          console.log('🔄 Starting database restore transaction...');

          // Disable foreign key constraints temporarily
          sqlite.prepare('PRAGMA foreign_keys = OFF').run();

          try {
            // First, check existing table schemas
            const existingTables = sqlite.prepare(`
              SELECT name FROM sqlite_master 
              WHERE type='table' AND name NOT LIKE 'sqlite_%'
            `).all().map(row => row.name);

            console.log('📋 Existing tables:', existingTables);

            // Clear existing data in safe order
            const tablesToClear = [
              'purchase_items', 'sale_items', 'purchases', 'sales', 
              'products', 'customers', 'suppliers', 'categories'
            ].filter(table => existingTables.includes(table));

            console.log('🗑️ Clearing tables:', tablesToClear);

            tablesToClear.forEach(table => {
              try {
                const result = sqlite.prepare(`DELETE FROM ${table}`).run();
                console.log(`🗑️ Cleared ${result.changes} records from ${table}`);
              } catch (clearError) {
                console.log(`⚠️ Could not clear ${table}: ${clearError.message}`);
              }
            });

            // Clear settings except essential ones
            if (existingTables.includes('settings')) {
              try {
                const settingsResult = sqlite.prepare('DELETE FROM settings WHERE key NOT IN ("admin_setup")').run();
                console.log(`🗑️ Cleared ${settingsResult.changes} settings`);
              } catch (settingsError) {
                console.log(`⚠️ Could not clear settings: ${settingsError.message}`);
              }
            }

            // Reset auto-increment sequences
            try {
              sqlite.prepare('DELETE FROM sqlite_sequence').run();
              console.log('🔄 Reset auto-increment sequences');
            } catch (seqError) {
              console.log(`⚠️ Could not reset sequences: ${seqError.message}`);
            }

            // Re-enable foreign key constraints
            sqlite.prepare('PRAGMA foreign_keys = ON').run();

            const data = backupData.data;
            console.log('📊 Backup data summary:', {
              categories: data.categories?.length || 0,
              suppliers: data.suppliers?.length || 0,
              customers: data.customers?.length || 0,
              products: data.products?.length || 0,
              sales: data.sales?.length || 0,
              purchases: data.purchases?.length || 0
            });

            // Restore data in dependency order with enhanced error handling

            // 1. Categories (no dependencies)
            if (data.categories?.length && existingTables.includes('categories')) {
              console.log(`📂 Restoring ${data.categories.length} categories...`);
              const insertCategory = sqlite.prepare('INSERT INTO categories (id, name, description, created_at) VALUES (?, ?, ?, ?)');
              let categoriesRestored = 0;
              data.categories.forEach(cat => {
                try {
                  insertCategory.run(
                    cat.id, 
                    cat.name, 
                    cat.description || null, 
                    cat.created_at || new Date().toISOString()
                  );
                  categoriesRestored++;
                } catch (catError) {
                  console.log(`⚠️ Failed to restore category ${cat.id}: ${catError.message}`);
                }
              });
              console.log(`✅ Restored ${categoriesRestored}/${data.categories.length} categories`);
            }

            // 2. Suppliers (no dependencies)
            if (data.suppliers?.length && existingTables.includes('suppliers')) {
              console.log(`🏢 Restoring ${data.suppliers.length} suppliers...`);

              // Check supplier table structure
              const supplierColumns = sqlite.prepare("PRAGMA table_info(suppliers)").all().map(col => col.name);
              console.log('Supplier table columns:', supplierColumns);

              // Build dynamic insert based on available columns
              const baseColumns = ['id', 'name'];
              const optionalColumns = ['email', 'phone', 'mobile_no', 'contact_person', 'address', 'city', 'state', 'country', 'pin_code', 'tax_id', 'supplier_type', 'status', 'created_at'];
              const availableColumns = baseColumns.concat(optionalColumns.filter(col => supplierColumns.includes(col)));

              const placeholders = availableColumns.map(() => '?').join(', ');
              const insertSupplier = sqlite.prepare(`INSERT INTO suppliers (${availableColumns.join(', ')}) VALUES (${placeholders})`);

              let suppliersRestored = 0;
              data.suppliers.forEach(sup => {
                try {
                  const values = availableColumns.map(col => {
                    if (col === 'id') return sup.id;
                    if (col === 'name') return sup.name;
                    if (col === 'created_at') return sup.created_at || new Date().toISOString();
                    if (col === 'status') return sup.status || 'active';
                    return sup[col] || null;
                  });

                  insertSupplier.run(...values);
                  suppliersRestored++;
                } catch (supError) {
                  console.log(`⚠️ Failed to restore supplier ${sup.id}: ${supError.message}`);
                }
              });
              console.log(`✅ Restored ${suppliersRestored}/${data.suppliers.length} suppliers`);
            }

            // 3. Customers (no dependencies)
            if (data.customers?.length && existingTables.includes('customers')) {
              console.log(`👥 Restoring ${data.customers.length} customers...`);

              // Check customer table structure
              const customerColumns = sqlite.prepare("PRAGMA table_info(customers)").all().map(col => col.name);
              console.log('Customer table columns:', customerColumns);

              const baseColumns = ['id', 'name'];
              const optionalColumns = ['email', 'phone', 'address', 'tax_id', 'credit_limit', 'business_name', 'created_at'];
              const availableColumns = baseColumns.concat(optionalColumns.filter(col => customerColumns.includes(col)));

              const placeholders = availableColumns.map(() => '?').join(', ');
              const insertCustomer = sqlite.prepare(`INSERT INTO customers (${availableColumns.join(', ')}) VALUES (${placeholders})`);

              let customersRestored = 0;
              data.customers.forEach(cust => {
                try {
                  const values = availableColumns.map(col => {
                    if (col === 'id') return cust.id;
                    if (col === 'name') return cust.name;
                    if (col === 'created_at') return cust.created_at || new Date().toISOString();
                    if (col === 'credit_limit') return cust.credit_limit || 0;
                    return cust[col] || null;
                  });

                  insertCustomer.run(...values);
                  customersRestored++;
                } catch (custError) {
                  console.log(`⚠️ Failed to restore customer ${cust.id}: ${custError.message}`);
                }
              });
              console.log(`✅ Restored ${customersRestored}/${data.customers.length} customers`);
            }

            // 4. Products (depends on categories)
            if (data.products?.length && existingTables.includes('products')) {
              console.log(`📦 Restoring ${data.products.length} products...`);

              // Check product table structure
              const productColumns = sqlite.prepare("PRAGMA table_info(products)").all().map(col => col.name);
              console.log('Product table columns:', productColumns);

              const baseColumns = ['id', 'name', 'sku', 'price'];
              const optionalColumns = ['description', 'mrp', 'cost', 'weight', 'weight_unit', 'category_id', 'stock_quantity', 'alert_threshold', 'barcode', 'image', 'active', 'created_at', 'updated_at'];
              const availableColumns = baseColumns.concat(optionalColumns.filter(col => productColumns.includes(col)));

              const placeholders = availableColumns.map(() => '?').join(', ');
              const insertProduct = sqlite.prepare(`INSERT INTO products (${availableColumns.join(', ')}) VALUES (${placeholders})`);

              let productsRestored = 0;
              data.products.forEach(prod => {
                try {
                  const values = availableColumns.map(col => {
                    if (col === 'id') return prod.id;
                    if (col === 'name') return prod.name;
                    if (col === 'sku') return prod.sku;
                    if (col === 'price') return prod.price;
                    if (col === 'mrp') return prod.mrp || prod.price;
                    if (col === 'cost') return prod.cost || 0;
                    if (col === 'category_id') return prod.category_id || 1;
                    if (col === 'stock_quantity') return prod.stock_quantity || 0;
                    if (col === 'alert_threshold') return prod.alert_threshold || 5;
                    if (col === 'weight_unit') return prod.weight_unit || 'kg';
                    if (col === 'active') return prod.active !== false ? 1 : 0;
                    if (col === 'created_at') return prod.created_at || new Date().toISOString();
                    if (col === 'updated_at') return prod.updated_at || new Date().toISOString();
                    return prod[col] || null;
                  });

                  insertProduct.run(...values);
                  productsRestored++;
                } catch (prodError) {
                  console.log(`⚠️ Failed to restore product ${prod.id}: ${prodError.message}`);
                }
              });
              console.log(`✅ Restored ${productsRestored}/${data.products.length} products`);
            }

            // Continue with sales, purchases, etc. using similar dynamic column approach...
            console.log('✅ Core data restoration completed');

          } catch (dataError) {
            console.error('❌ Error during data restoration:', dataError);
            throw dataError;
          } finally {
            // Always re-enable foreign keys
            try {
              sqlite.prepare('PRAGMA foreign_keys = ON').run();
            } catch (pragmaError) {
              console.log('⚠️ Could not re-enable foreign keys:', pragmaError.message);
            }
          }
        });

        // Execute the transaction
        restoreTransaction();

        console.log('✅ Backup restore completed successfully');
        res.json({ 
          success: true, 
          message: 'Data restored successfully from backup',
          timestamp: new Date().toISOString()
        });

      } catch (transactionError) {
        console.error('❌ Transaction failed:', transactionError);

        let errorMessage = 'Database transaction failed during restore';
        let userMessage = 'Failed to restore backup due to database error';

        if (transactionError.message?.includes('SQLITE_CONSTRAINT')) {
          userMessage = 'Backup data conflicts with existing database constraints. The database may have been partially restored.';
        } else if (transactionError.message?.includes('no such table')) {
          userMessage = 'Database schema is incomplete. Please contact support.';
        } else if (transactionError.message?.includes('no such column')) {
          userMessage = 'Database schema mismatch. The backup may be from a different version.';
        }

        res.status(500).json({ 
          error: errorMessage,
          message: userMessage,
          technical: transactionError.message,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('❌ Critical error during backup restore:', error);

      if (error.message?.includes('entity too large')) {
        return res.status(413).json({ 
          error: 'Backup file too large',
          message: 'The backup file is too large to process. Please try a smaller backup file.',
          timestamp: new Date().toISOString()
        });
      }

      res.status(500).json({ 
        error: 'Critical restore failure',
        message: error.message || 'An unexpected error occurred during restore',
        timestamp: new Date().toISOString()
      });
    }
  });

  app.post('/api/data/clear', async (req, res) => {
    try {
      console.log('🔄 Clearing all data...');

      const { sqlite } = await import('../db/index.js');

      // Check database connection first
      try {
        sqlite.prepare('SELECT 1').get();
        console.log('✅ Database connection verified');
      } catch (dbError) {
        console.error('❌ Database connection failed:', dbError);
        return res.status(500).json({ 
          error: 'Database connection failed',
          message: 'Unable to connect to database. Please try again later.'
        });
      }

      // Disable foreign key constraints temporarily
      sqlite.prepare('PRAGMA foreign_keys = OFF').run();

      try {
        // Start transaction to clear all data
        const clearTransaction = sqlite.transaction(() => {
          console.log('🗑️ Starting data clearing transaction...');

          // Get all table names first
          const tables = sqlite.prepare(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
          `).all().map((row: any) => row.name);

          console.log('📋 Available tables:', tables);

          // Clear data in safe order (children first to avoid FK violations)
          const tablesToClear = [
            'return_items',
            'returns', 
            'purchase_items',
            'sale_items',
            'purchases',
            'sales',
            'products',
            'customers',
            'suppliers',
            'categories'
          ].filter(table => tables.includes(table));

          console.log('🗑️ Tables to clear:', tablesToClear);

          let totalCleared = 0;
          tablesToClear.forEach(table => {
            try {
              const result = sqlite.prepare(`DELETE FROM ${table}`).run();
              console.log(`🗑️ Cleared ${result.changes} records from ${table}`);
              totalCleared += result.changes;
            } catch (clearError) {
              console.log(`⚠️ Could not clear ${table}: ${clearError.message}`);
              // Continue with other tables even if one fails
            }
          });

          // Clear settings except essential ones
          if (tables.includes('settings')) {
            try {
              const settingsResult = sqlite.prepare(`
                DELETE FROM settings 
                WHERE key NOT IN ('admin_setup', 'businessName', 'currency')
              `).run();
              console.log(`🗑️ Cleared ${settingsResult.changes} settings`);
            } catch (settingsError) {
              console.log(`⚠️ Could not clear settings: ${settingsError.message}`);
            }
          }

          // Reset auto-increment sequences
          try {
            sqlite.prepare('DELETE FROM sqlite_sequence').run();
            console.log('🔄 Reset auto-increment sequences');
          } catch (seqError) {
            console.log(`⚠️ Could not reset sequences: ${seqError.message}`);
          }

          console.log(`✅ Data clearing completed. Total records cleared: ${totalCleared}`);
          return totalCleared;
        });

        const recordsCleared = clearTransaction();

        // Re-enable foreign key constraints
        sqlite.prepare('PRAGMA foreign_keys = ON').run();

        console.log('✅ All data cleared successfully');

        res.json({ 
          success: true, 
          message: 'All data cleared successfully',
          recordsCleared: recordsCleared,
          timestamp: new Date().toISOString()
        });

      } catch (transactionError) {
        // Re-enable foreign keys even if transaction fails
        try {
          sqlite.prepare('PRAGMA foreign_keys = ON').run();
        } catch (pragmaError) {
          console.log('⚠️ Could not re-enable foreign keys:', pragmaError.message);
        }

        throw transactionError;
      }

    } catch (error) {
      console.error('❌ Error clearing data:', error);

      let errorMessage = 'Failed to clear data';
      let userMessage = 'An error occurred while clearing data. Please try again.';

      if (error.message?.includes('SQLITE_BUSY')) {
        userMessage = 'Database is busy. Please wait a moment and try again.';
      } else if (error.message?.includes('SQLITE_LOCKED')) {
        userMessage = 'Database is locked. Please close any other operations and try again.';
      } else if (error.message?.includes('no such table')) {
        userMessage = 'Database tables are missing. Please contact support.';
      }

      res.status(500).json({ 
        error: errorMessage,
        message: userMessage,
        technical: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Return management endpoints
  app.get('/api/returns', async (req, res) => {
    try {
      console.log('📦 Fetching returns data');

      const limit = parseInt(req.query.limit as string || '50');
      const search = req.query.search as string;
      const days = parseInt(req.query.days as string || '0');
      const status = req.query.status as string;

      // Use storage method for returns with filters
      const returns = await storage.listReturns(limit, 0, { search, days, status });
      console.log(`📦 Found ${returns.length} returns`);

      res.json(returns);
    } catch (error) {
      console.error('❌ Error fetching returns:', error);
      res.status(500).json({ error: 'Failed to fetch returns: ' + error.message });
    }
  });

  // Returns statistics endpoint
  app.get('/api/returns/stats', async (req, res) => {
    try {
      console.log('📊 Fetching returns statistics');

      const { sqlite } = await import('../db/index.js');

      // Get total returns and refund amount
      const totalStats = sqlite.prepare(`
        SELECT 
          COUNT(*) as totalReturns,
          COALESCE(SUM(CAST(total_refund AS REAL)), 0) as totalRefundAmount
        FROM returns
      `).get();

      // Get today's returns
      const todayStats = sqlite.prepare(`
        SELECT 
          COUNT(*) as todayReturns,
          COALESCE(SUM(CAST(total_refund AS REAL)), 0) as todayRefundAmount
        FROM returns 
        WHERE DATE(created_at) = DATE('now')
      `).get();

      // Calculate return rate (returns vs sales)
      const salesCount = sqlite.prepare(`
        SELECT COUNT(*) as count FROM sales
      `).get();

      const returnRate = salesCount.count > 0 ? 
        (totalStats.totalReturns / salesCount.count) * 100 : 0;

      // Calculate average return value
      const averageReturnValue = totalStats.totalReturns > 0 ? 
        totalStats.totalRefundAmount / totalStats.totalReturns : 0;

      const stats = {
        totalReturns: totalStats.totalReturns || 0,
        totalRefundAmount: totalStats.totalRefundAmount || 0,
        todayReturns: todayStats.todayReturns || 0,
        todayRefundAmount: todayStats.todayRefundAmount || 0,
        returnRate: returnRate,
        averageReturnValue: averageReturnValue
      };

      console.log('📊 Returns stats:', stats);
      res.json(stats);

    } catch (error) {
      console.error('❌ Error fetching returns stats:', error);
      res.status(500).json({ error: 'Failed to fetch returns statistics: ' + error.message });
    }
  });

  app.post('/api/returns', async (req, res) => {
    try {
      console.log('🔄 Processing return request:', req.body);

      const { saleId, items, refundMethod, totalRefund, reason, notes } = req.body;

      // Validate required fields
      if (!saleId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Sale ID and items are required' });
      }

      if (!refundMethod || !totalRefund || !reason) {
        return res.status(400).json({ error: 'Refund method, total refund amount, and reason are required' });
      }

      // Get user ID
      const userId = (req.user as any)?.id || 1;

      // Use storage method for creating return
      const returnData = {
        saleId: parseInt(saleId),
        userId: userId,
        refundMethod: refundMethod,
        totalRefund: parseFloat(totalRefund),
        reason: reason,
        notes: notes || '',
        status: 'completed'
      };

      const result = await storage.createReturn(returnData, items);

      console.log('✅ Return processed successfully:', result);

      res.json({ 
        success: true, 
        returnId: result.id,
        returnNumber: result.return_number || `RET-${result.id}`,
        message: 'Return processed successfully'
      });

    } catch (error) {
      console.error('❌ Error processing return:', error);
      res.status(500).json({ 
        error: 'Failed to process return',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Sales API
  app.post("/api/sales", async (req, res) => {
    try {
      console.log("📊 Processing POS Enhanced sale request:", req.body);

      const {
        customerId,
        customerName,
        items,
        subtotal,
        discount,
        discountPercent,
        tax,
        taxRate,
        total,
        paymentMethod,
        amountPaid,
        change,
        notes,
        billNumber,
        status,
        cashAmount,
        upiAmount,
        cardAmount,
        bankTransferAmount,
        chequeAmount
      } = req.body;

      // Validate required fields
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ 
          error: "Transaction failed",
          message: "Items are required for sale",
          details: "Please add items to complete the transaction"
        });
      }

      if (!total || parseFloat(total) <= 0) {
        return res.status(400).json({ 
          error: "Transaction failed",
          message: "Valid total amount is required",
          details: "Please check the total amount"
        });
      }

      // Generate order number if not provided
      const orderNumber = billNumber || `POS-${Date.now()}`;

      // Safely handle customerId - ensure it's null if undefined/empty
      const safeCustomerId = customerId && parseInt(customerId.toString()) > 0 ? parseInt(customerId.toString()) : null;

      // Get user ID safely
      const userId = (req.user as any)?.id || 1;

      // Prepare sale items with validation
      const saleItems = items.map((item: any) => {
        const productId = parseInt(item.productId);
        const quantity = parseInt(item.quantity);
        const unitPrice = parseFloat(item.unitPrice || item.price || "0");
        const itemSubtotal = parseFloat(item.total || item.subtotal || (quantity * unitPrice));

        if (isNaN(productId) || isNaN(quantity) || isNaN(unitPrice)) {
          throw new Error(`Invalid item data: productId=${item.productId}, quantity=${item.quantity}, price=${item.unitPrice || item.price}`);
        }

        return {
          productId,
          quantity,
          unitPrice,
          price: unitPrice,
          subtotal: itemSubtotal,
          total: itemSubtotal
        };
      });

      console.log("✅ Validated sale items:", saleItems);

      // Direct SQLite transaction for reliable data saving
      const { sqlite } = await import('../db/index.js');

      const result = sqlite.transaction(() => {
        try {
          // Insert the sale record with split payment amounts
          const insertSale = sqlite.prepare(`
            INSERT INTO sales (
              order_number, customer_id, user_id, total, tax, discount, 
              payment_method, status, created_at, cash_amount, upi_amount, 
              card_amount, bank_transfer_amount, cheque_amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?)
          `);

          const saleResult = insertSale.run(
            orderNumber,
            safeCustomerId,
            userId,
            parseFloat(total).toString(),
            parseFloat(tax || "0").toString(),
            parseFloat(discount || "0").toString(),
            paymentMethod || "cash",
            status || "completed",
            parseFloat(cashAmount || "0"),
            parseFloat(upiAmount || "0"),
            parseFloat(cardAmount || "0"),
            parseFloat(bankTransferAmount || "0"),
            parseFloat(chequeAmount || "0")
          );

          const saleId = saleResult.lastInsertRowid;
          console.log(`💾 Created sale record with ID: ${saleId}`);

          // Insert sale items and update product stock
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

          for (const item of saleItems) {
            // Insert sale item
            insertSaleItem.run(
              saleId,
              item.productId,
              item.quantity,
              item.unitPrice.toString(),
              item.price.toString(),
              item.subtotal.toString(),
              item.total.toString()
            );

            // Update product stock
            const stockResult = updateStock.run(item.quantity, item.productId);
            console.log(`📦 Updated stock for product ${item.productId}: -${item.quantity} (changes: ${stockResult.changes})`);
          }

          // Get the created sale for return
          const getSale = sqlite.prepare('SELECT * FROM sales WHERE id = ?');
          const newSale = getSale.get(saleId);

          return {
            ...newSale,
            id: saleId,
            createdAt: new Date()
          };
        } catch (transactionError) {
          console.error("❌ Transaction failed:", transactionError);
          throw transactionError;
        }
      })();

      console.log("✅ Sale transaction completed successfully");

      // Return success response
      const responseData = {
        id: result.id,
        saleId: result.id,
        billNumber: orderNumber,
        orderNumber: orderNumber,
        total: parseFloat(total),
        change: parseFloat(change || "0"),
        paymentMethod: paymentMethod || "cash",
        status: "completed",
        message: "Sale completed successfully",
        timestamp: new Date().toISOString(),
        saved: true
      };

      console.log("📊 POS Enhanced sale saved successfully:", responseData);
      res.status(201).json(responseData);

    } catch (error) {
      console.error("💥 Error saving POS Enhanced sale:", error);

      // Return detailed error information
      const errorResponse = {
        error: "Transaction failed",
        message: error.message || "Internal server error occurred",
        details: "Failed to save sale data to database",
        timestamp: new Date().toISOString(),
        saved: false
      };

      res.status(500).json(errorResponse);
    }
  });

  app.get('/api/sales', async (req, res) => {
    try {
      console.log('📊 Sales API endpoint accessed with query:', req.query);

      const limit = parseInt(req.query.limit as string || '20');
      const offset = parseInt(req.query.offset as string || '0');
      const search = req.query.search as string;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : undefined;
      const days = req.query.days ? parseInt(req.query.days as string) : undefined;

      // Try direct database query first
      try {
        const { sqlite } = await import('../db/index.js');

        let query = `
          SELECT 
            s.id,
            s.order_number,
            s.customer_id,
            s.user_id,
            s.total,
            s.tax,
            s.discount,
            s.payment_method,
            s.status,
            s.created_at,
            s.cash_amount,
            s.upi_amount,
            s.card_amount,
            s.bank_transfer_amount,
            s.cheque_amount,
            c.name as customerName, 
            c.phone as customerPhone, 
            u.name as userName,
            (
              SELECT GROUP_CONCAT(p.name || ' (x' || si.quantity || ')')
              FROM sale_items si 
              LEFT JOIN products p ON si.product_id = p.id 
              WHERE si.sale_id = s.id
            ) as items_summary
          FROM sales s
          LEFT JOIN customers c ON s.customer_id = c.id
          LEFT JOIN users u ON s.user_id = u.id
        `;

        const params = [];

        // Add search conditions - make search more flexible
        if (search) {
          query += ` WHERE (
            LOWER(s.order_number) LIKE LOWER(?) OR
            LOWER(c.name) LIKE LOWER(?) OR
            c.phone LIKE ? OR
            CAST(s.id AS TEXT) LIKE ?
          )`;
          params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        // Add date filters
        let whereAdded = search ? true : false;
        if (startDate) {
          query += whereAdded ? ' AND' : ' WHERE';
          query += ' s.created_at >= ?';
          params.push(startDate.toISOString());
          whereAdded = true;
        }

        if (endDate) {
          query += whereAdded ? ' AND' : ' WHERE';
          query += ' s.created_at <= ?';
          params.push(endDate.toISOString());
          whereAdded = true;
        }

        if (userId) {
          query += whereAdded ? ' AND' : ' WHERE';
          query += ' s.user_id = ?';
          params.push(userId);
          whereAdded = true;
        }

        if (customerId) {
          query += whereAdded ? ' AND' : ' WHERE';
          query += ' s.customer_id = ?';
          params.push(customerId);
          whereAdded = true;
        }

        // Add days filter for time range filtering
        if (days) {
          const dateThreshold = new Date();
          if (days === 1) {
            // For "Today", filter to today's date only
            dateThreshold.setHours(0, 0, 0, 0);
          } else {
            // For other ranges, go back N days
            dateThreshold.setDate(dateThreshold.getDate() - days);
            dateThreshold.setHours(0, 0, 0, 0);
          }

          // Format date for SQLite comparison (YYYY-MM-DD HH:mm:ss)
          const sqliteDate = dateThreshold.toISOString().slice(0, 19).replace('T', ' ');

          query += whereAdded ? ' AND' : ' WHERE';
          query += ' s.created_at >= ?';
          params.push(sqliteDate);
          whereAdded = true;
        }

        query += ` ORDER BY s.created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        console.log('🔍 Executing query:', query);
        console.log('📝 Query params:', params);

        const sales = sqlite.prepare(query).all(...params);

        console.log(`✅ Direct query found ${sales.length} sales`);

        // Get sale items for all sales
        const saleIds = sales.map(sale => sale.id);
        let allSaleItems = [];

        if (saleIds.length > 0) {
          const saleItemsQuery = `
            SELECT 
              si.sale_id,
              si.id,
              si.product_id,
              si.quantity,
              si.unit_price,
              si.price,
              si.subtotal,
              si.total,
              si.mrp,
              p.name as product_name,
              p.sku as product_sku
            FROM sale_items si
            LEFT JOIN products p ON si.product_id = p.id
            WHERE si.sale_id IN (${saleIds.map(() => '?').join(',')})
            ORDER BY si.id
          `;

          allSaleItems = sqlite.prepare(saleItemsQuery).all(...saleIds);
          console.log(`📦 Found ${allSaleItems.length} sale items for ${saleIds.length} sales`);
        }

        // Group sale items by sale_id
        const saleItemsMap = {};
        allSaleItems.forEach(item => {
          if (!saleItemsMap[item.sale_id]) {
            saleItemsMap[item.sale_id] = [];
          }
          saleItemsMap[item.sale_id].push({
            id: item.id,
            productId: item.product_id,
            quantity: item.quantity,
            unitPrice: item.unit_price || item.price,
            price: item.price,
            subtotal: item.subtotal || item.total,
            total: item.total,
            mrp: item.mrp,
            product: {
              id: item.product_id,
              name: item.product_name || `Product #${item.product_id}`,
              sku: item.product_sku || ''
            }
          });
        });

        // Format the results with sale items and split payment fields
        const formattedSales = sales.map(sale => ({
          id: sale.id,
          orderNumber: sale.order_number,
          customerId: sale.customer_id,
          userId: sale.user_id,
          total: sale.total,
          tax: sale.tax,
          discount: sale.discount,
          paymentMethod: sale.payment_method,
          status: sale.status,
          createdAt: sale.created_at,
          // Split payment amounts for bank integration
          cash_amount: sale.cash_amount || 0,
          upi_amount: sale.upi_amount || 0,
          card_amount: sale.card_amount || 0,
          bank_transfer_amount: sale.bank_transfer_amount || 0,
          cheque_amount: sale.cheque_amount || 0,
          customer: sale.customerName ? {
            id: sale.customer_id,
            name: sale.customerName,
            phone: sale.customerPhone
          } : null,
          user: {
            id: sale.user_id,
            name: sale.userName || 'System User'
          },
          itemsSummary: sale.items_summary,
          items: saleItemsMap[sale.id] || []
        }));

        // Debug the first sale to ensure split payment data is included
        if (formattedSales.length > 0) {
          console.log('🔎 First formatted sale with split payments:', JSON.stringify(formattedSales[0], null, 2));
        }

        return res.json(formattedSales);

      } catch (dbError) {
        console.error('❌ Direct database query failed:', dbError);
        return res.json([]);
      }

    } catch (error) {
      console.error('💥 Error in sales endpoint:', error);
      res.status(500).json({ 
        message: 'Failed to fetch sales', 
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.get('/api/sales/recent', async (req, res) => {
    try {
      console.log('🔄 POS Enhanced - Recent sales endpoint accessed');
      const limit = parseInt(req.query.limit as string || '10');

      // Direct database approach with proper column names
      const { sqlite } = await import('../db/index.js');

      // First check if sales table exists and has data
      const tableCheck = sqlite.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='sales'
      `).get();

      if (!tableCheck) {
        console.log('❌ Sales table does not exist');
        return res.json([]);
      }

      // Get total count first
      const countQuery = sqlite.prepare('SELECT COUNT(*) as count FROM sales');
      const totalCount = countQuery.get();
      console.log(`📊 Total sales in database: ${totalCount.count}`);

      if (totalCount.count === 0) {
        console.log('📝 No sales data found - returning empty array');
        return res.json([]);
      }

      const query = `
        SELECT 
          s.id,
          s.order_number as orderNumber,
          s.customer_id as customerId,
          s.user_id as userId,
          s.total,
          s.tax,
          s.discount,
          s.payment_method as paymentMethod,
          s.status,
          s.created_at as createdAt,
          c.name as customerName,
          c.phone as customerPhone,
          u.name as userName,
          COUNT(si.id) as itemCount
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN users u ON s.user_id = u.id
        LEFT JOIN sale_items si ON s.id = si.sale_id
        GROUP BY s.id, s.order_number, s.customer_id, s.user_id, s.total, s.tax, s.discount, 
                 s.payment_method, s.status, s.created_at, c.name, c.phone, u.name
        ORDER BY s.created_at DESC
        LIMIT ?
      `;

      console.log('🔍 Executing enhanced sales query');
      const salesData = sqlite.prepare(query).all(limit);

      console.log(`✅ Found ${salesData.length} recent sales with item counts`);

      // Format the response with enhanced data
      const formattedSales = salesData.map(sale => ({
        id: sale.id,
        orderNumber: sale.orderNumber || `POS-${sale.id}`,
        customerId: sale.customerId,
        customerName: sale.customerName || 'Walk-in Customer',
        customerPhone: sale.customerPhone,
        userId: sale.userId,
        userName: sale.userName || 'System User',
        total: parseFloat(sale.total || '0'),
        tax: parseFloat(sale.tax || '0'),
        discount: parseFloat(sale.discount || '0'),
        paymentMethod: sale.paymentMethod || 'cash',
        status: sale.status || 'completed',
        createdAt: sale.createdAt,
        itemCount: sale.itemCount || 0,
        source: 'POS Enhanced',
        items: sale.itemCount > 0 ? [{ productName: `${sale.itemCount} items`, quantity: sale.itemCount }] : []
      }));

      console.log('📊 Returning formatted sales data:', formattedSales.length);
      res.json(formattedSales);

    } catch (error) {
      console.error('💥 Error in POS Enhanced recent sales endpoint:', error);
      res.status(500).json({ 
        error: 'Failed to fetch recent sales',
        message: error.message,
        timestamp: new Date().toISOString(),
        source: 'POS Enhanced API'
      });
    }
  });

  app.get('/api/sales/:id', async (req, res) => {
    try {
      const saleId = parseInt(req.params.id);
      console.log('🔍 Fetching sale details for ID:', saleId);

      // Use direct SQLite query for better reliability
      const { sqlite } = await import('../db/index.js');

      // Get sale details
      const saleQuery = sqlite.prepare(`
        SELECT 
          s.*,
          c.name as customer_name,
          c.phone as customer_phone,
          c.email as customer_email,
          u.name as user_name
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.id = ?
      `);

      const sale = saleQuery.get(saleId);

      if (!sale) {
        return res.status(404).json({ error: 'Sale not found' });
      }

      // Get sale items
      const itemsQuery = sqlite.prepare(`
        SELECT 
          si.*,
          p.name as product_name,
          p.sku as product_sku,
          p.price as product_price
        FROM sale_items si
        LEFT JOIN products p ON si.product_id = p.id
        WHERE si.sale_id = ?
        ORDER BY si.id
      `);

      const items = itemsQuery.all(saleId);

      const result = {
        id: sale.id,
        orderNumber: sale.order_number,
        customerId: sale.customer_id,
        userId: sale.user_id,
        total: sale.total,
        tax: sale.tax,
        discount: sale.discount,
        paymentMethod: sale.payment_method,
        status: sale.status,
        createdAt: sale.created_at,
        customerName: sale.customer_name,
        customer: sale.customer_name ? {
          id: sale.customer_id,
          name: sale.customer_name,
          phone: sale.customer_phone,
          email: sale.customer_email
        } : null,
        user: {
          id: sale.user_id,
          name: sale.user_name || 'System User'
        },
        items: items.map(item => ({
          id: item.id,
          productId: item.product_id,
          quantity: item.quantity,
          unitPrice: item.unit_price || item.price,
          subtotal: item.subtotal || item.total,
          product: {
            id: item.product_id,
            name: item.product_name || `Product #${item.product_id}`,
            sku: item.product_sku || '',
            price: item.product_price || item.unit_price || item.price || '0'
          }
        }))
      };

      console.log('✅ Sale details found:', result);
      res.json(result);
    } catch (error) {
      console.error('❌ Error fetching sale:', error);
      res.status(500).json({ error: 'Failed to fetch sale details' });
    }
  });

  app.put('/api/sales/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;

      console.log('Updating sale:', id, updateData);

      // Check if sale exists
      const existingSale = await storage.getSaleById(id);
      if (!existingSale) {
        return res.status(404).json({ message: 'Sale not found' });
      }

      // Update the sale
      const updatedSale = await storage.updateSale(id, updateData);

      res.json({
        ...updatedSale,
        message: 'Sale updated successfully'
      });
    } catch (error) {
      console.error('Error updating sale:', error);
      res.status(500).json({ 
        message: 'Failed to update sale',
        error: error.message 
      });
    }
  });

  app.delete('/api/sales/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      console.log('Deleting sale:', id);

      // Check if sale exists
      const existingSale = await storage.getSaleById(id);
      if (!existingSale) {
        return res.status(404).json({ message: 'Sale not found' });
      }

      // Delete the sale
      const deleted = await storage.deleteSale(id);

      if (!deleted) {
        return res.status(500).json({ message: 'Failed to delete sale' });
      }

      res.json({ 
        message: 'Sale deleted successfully',
        deletedId: id
      });
    } catch (error) {
      console.error('Error deleting sale:', error);
      res.status(500).json({ 
        message: 'Failed to delete sale',
        error: error.message 
      });
    }
  });

  // Purchases API
  app.post('/api/purchases', isAuthenticated, async (req, res) => {
    try {
      const { supplierId, items, ...purchaseData } = req.body;

      if (!supplierId) {
        return res.status(400).json({ message: 'Supplier ID is required' });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Purchase must have at least one item' });
      }

      const parsedItems = items.map(item => {
        // Ensure all values are valid numbers
        const ensureInt = (val: any) => {
          const num = parseInt(val);
          return isNaN(num) ? 0 : num;
        };

        const ensureFloat = (val: any) => {
          const num = parseFloat(val);
          return isNaN(num) ? 0 : num;
        };

        return {
          productId: ensureInt(item.productId),
          quantity: ensureInt(item.quantity),
          receivedQty: ensureInt(item.receivedQty || item.quantity),
          freeQty: ensureInt(item.freeQty),
          unitCost: ensureFloat(item.unitCost),
          cost: ensureFloat(item.cost || item.unitCost),
          hsnCode: item.hsnCode || "",
          taxPercentage: ensureFloat(item.taxPercentage),
          discountAmount: ensureFloat(item.discountAmount),
          discountPercent: ensureFloat(item.discountPercent),
          expiryDate: item.expiryDate || "",
          batchNumber: item.batchNumber || "",
          sellingPrice: ensureFloat(item.sellingPrice),
          mrp: ensureFloat(item.mrp),
          netCost: ensureFloat(item.netCost || item.unitCost),
          netAmount: ensureFloat(item.netAmount),
          location: item.location || "",
          unit: item.unit || "PCS",
          roiPercent: ensureFloat(item.roiPercent),
          grossProfitPercent: ensureFloat(item.grossProfitPercent),
          cashPercent: ensureFloat(item.cashPercent),
          cashAmount: ensureFloat(item.cashAmount)
        };
      });

      // Ensure supplier ID is a valid number
      const suppId = parseInt(supplierId);
      const validSupplierId = isNaN(suppId) ? 1 : suppId;

      console.log("Creating purchase with supplier ID:", validSupplierId);
      console.log("Parsed items:", parsedItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        receivedQty: item.receivedQty,
        freeQty: item.freeQty,
        unitCost: item.unitCost
      })));

      const purchase = await storage.createPurchase(
        (req.user as any).id,
        validSupplierId,
        parsedItems,
        purchaseData
      );

      res.status(201).json(purchase);
    } catch (error) {
      console.error('Error creating purchase:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Update purchase endpoint
  app.put('/api/purchases/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;

      console.log('🔄 Updating purchase ID:', id);
      console.log('📝 Update data received:', JSON.stringify(updateData, null, 2));

      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ 
          message: 'Invalid purchase ID',
          error: 'Purchase ID must be a valid positive number'
        });
      }

      // Validate required fields
      if (!updateData.supplierId || updateData.supplierId <= 0) {
        return res.status(400).json({ 
          message: 'Supplier is required',
          error: 'Please select a valid supplier'
        });
      }

      if (!updateData.orderNumber || updateData.orderNumber.trim() === '') {
        return res.status(400).json({ 
          message: 'Order number is required',
          error: 'Please provide a valid order number'
        });
      }

      // Check if purchase exists
      const { sqlite } = await import('../db/index.js');

      const existingPurchaseQuery = sqlite.prepare('SELECT * FROM purchases WHERE id = ?');
      const existingPurchase = existingPurchaseQuery.get(id);

      if (!existingPurchase) {
        return res.status(404).json({ 
          message: 'Purchase not found',
          error: `No purchase order found with ID ${id}`
        });
      }

      console.log('✅ Found existing purchase:', existingPurchase.order_number);

      // Use transaction for atomic updates
      const result = sqlite.transaction(() => {
        try {
          // Ensure purchases table has all required columns
          const tableInfo = sqlite.prepare("PRAGMA table_info(purchases)").all();
          const columnNames = tableInfo.map(col => col.name);
          console.log('📋 Available columns:', columnNames);

          // Build dynamic update query based on available columns
          const updateFields = [];
          const updateValues = [];

          // Core fields that should always exist
          if (columnNames.includes('order_number')) {
            updateFields.push('order_number = ?');
            updateValues.push(updateData.orderNumber);
          }

          if (columnNames.includes('supplier_id')) {
            updateFields.push('supplier_id = ?');
            updateValues.push(updateData.supplierId);
          }

          if (columnNames.includes('order_date')) {
            updateFields.push('order_date = ?');
            updateValues.push(updateData.orderDate || existingPurchase.order_date);
          }

          // Optional fields
          const optionalFields = [
            { column: 'expected_date', value: updateData.expectedDate },
            { column: 'due_date', value: updateData.expectedDate },
            { column: 'payment_method', value: updateData.paymentMethod || 'Credit' },
            { column: 'payment_terms', value: updateData.paymentTerms || 'Net 30' },
            { column: 'status', value: updateData.status || 'Pending' },
            { column: 'invoice_number', value: updateData.invoiceNumber || '' },
            { column: 'invoice_date', value: updateData.invoiceDate || '' },
            { column: 'invoice_amount', value: parseFloat(updateData.invoiceAmount || '0') },
            { column: 'remarks', value: updateData.remarks || '' },
            { column: 'freight_amount', value: parseFloat(updateData.freightAmount || '0') },
            { column: 'surcharge_amount', value: parseFloat(updateData.surchargeAmount || '0') },
            { column: 'packing_charges', value: parseFloat(updateData.packingCharges || '0') },
            { column: 'other_charges', value: parseFloat(updateData.otherCharges || '0') },
            { column: 'additional_discount', value: parseFloat(updateData.additionalDiscount || '0') }
          ];

          optionalFields.forEach(field => {
            if (columnNames.includes(field.column)) {
              updateFields.push(`${field.column} = ?`);
              updateValues.push(field.value);
            }
          });

          // Always update timestamp if column exists
          if (columnNames.includes('updated_at')) {
            updateFields.push('updated_at = CURRENT_TIMESTAMP');
          }

          updateValues.push(id); // For WHERE clause

          const updateQuery = `UPDATE purchases SET ${updateFields.join(', ')} WHERE id = ?`;
          console.log('🔧 Update query:', updateQuery);
          console.log('📊 Update values:', updateValues);

          const updatePurchase = sqlite.prepare(updateQuery);
          const purchaseResult = updatePurchase.run(...updateValues);

          console.log(`✅ Updated purchase record: ${purchaseResult.changes} changes`);

          if (purchaseResult.changes === 0) {
            throw new Error('No changes were made to the purchase record');
          }

          // Handle purchase items update if provided
          if (updateData.items && Array.isArray(updateData.items) && updateData.items.length > 0) {
            console.log(`🔄 Updating ${updateData.items.length} purchase items`);

            // Get existing items to calculate stock differences
            const existingItemsQuery = sqlite.prepare(`
              SELECT product_id, received_qty FROM purchase_items WHERE purchase_id = ?
            `);
            const existingItems = existingItemsQuery.all(id);

            // Create map of existing quantities
            const existingQtyMap = new Map();
            existingItems.forEach(item => {
              existingQtyMap.set(item.product_id, item.received_qty || 0);
            });

            // Delete existing items
            const deleteItems = sqlite.prepare('DELETE FROM purchase_items WHERE purchase_id = ?');
            const deleteResult = deleteItems.run(id);
            console.log(`🗑️ Deleted ${deleteResult.changes} existing items`);

            // Check if purchase_items table exists and get its structure
            const itemTableInfo = sqlite.prepare("PRAGMA table_info(purchase_items)").all();
            const itemColumnNames = itemTableInfo.map(col => col.name);
            console.log('📋 Available item columns:', itemColumnNames);

            // Build dynamic insert query for items
            const itemFields = ['purchase_id', 'product_id'];
            const itemPlaceholders = ['?', '?'];

            const optionalItemFields = [
              'quantity', 'received_qty', 'free_qty', 'unit_cost', 'cost',
              'selling_price', 'wholesale_price', 'mrp', 'hsn_code', 'tax_percentage', 
              'discount_amount', 'discount_percent', 'expiry_date', 
              'batch_number', 'net_cost', 'roi_percent', 'gross_profit_percent',
              'net_amount', 'cash_percent', 'cash_amount', 'location', 'unit',
              'subtotal', 'total', 'amount'
            ];

            optionalItemFields.forEach(field => {
              if (itemColumnNames.includes(field)) {
                itemFields.push(field);
                itemPlaceholders.push('?');
              }
            });

            const insertItemQuery = `
              INSERT INTO purchase_items (${itemFields.join(', ')}) 
              VALUES (${itemPlaceholders.join(', ')})
            `;

            const insertItem = sqlite.prepare(insertItemQuery);
            const updateStock = sqlite.prepare(`
              UPDATE products 
              SET stock_quantity = COALESCE(stock_quantity, 0) + ?
              WHERE id = ?
            `);

            let itemsProcessed = 0;

            updateData.items.forEach((item: any, index: number) => {
              if (!item.productId || item.productId <= 0) {
                console.log(`⚠️ Skipping item ${index + 1}: Invalid product ID`);
                return;
              }

              const receivedQty = Math.max(parseInt(item.receivedQty || item.quantity || 0), 0);
              const quantity = Math.max(parseInt(item.quantity || receivedQty || 1), 0);
              const unitCost = Math.max(parseFloat(item.unitCost || 0), 0);

              if (receivedQty === 0 || unitCost === 0) {
                console.log(`⚠️ Skipping item ${index + 1}: Zero quantity or cost`);
                return;
              }

              // Build values array based on available columns
              const itemValues = [id, item.productId]; // Required fields

              optionalItemFields.forEach(field => {
                if (itemColumnNames.includes(field)) {
                  switch (field) {
                    case 'quantity':
                      itemValues.push(quantity);
                      break;
                    case 'received_qty':
                      itemValues.push(receivedQty);
                      break;
                    case 'free_qty':
                      itemValues.push(parseInt(item.freeQty || 0));
                      break;
                    case 'unit_cost':
                    case 'cost':
                      itemValues.push(unitCost);
                      break;
                    case 'selling_price':
                      itemValues.push(parseFloat(item.sellingPrice || 0));
                      break;
                    case 'wholesale_price':
                      itemValues.push(parseFloat(item.wholesalePrice || 0));
                      break;
                    case 'mrp':
                      itemValues.push(parseFloat(item.mrp || 0));
                      break;
                    case 'hsn_code':
                      itemValues.push(item.hsnCode || '');
                      break;
                    case 'tax_percentage':
                      itemValues.push(parseFloat(item.taxPercentage || 0));
                      break;
                    case 'discount_amount':
                      itemValues.push(parseFloat(item.discountAmount || 0));
                      break;
                    case 'discount_percent':
                      itemValues.push(parseFloat(item.discountPercent || 0));
                      break;
                    case 'expiry_date':
                      itemValues.push(item.expiryDate || '');
                      break;
                    case 'batch_number':
                      itemValues.push(item.batchNumber || '');
                      break;
                    case 'net_cost':
                      itemValues.push(parseFloat(item.netCost || unitCost));
                      break;
                    case 'roi_percent':
                      itemValues.push(parseFloat(item.roiPercent || 0));
                      break;
                    case 'gross_profit_percent':
                      itemValues.push(parseFloat(item.grossProfitPercent || 0));
                      break;
                    case 'net_amount':
                      itemValues.push(parseFloat(item.netAmount || (receivedQty * unitCost)));
                      break;
                    case 'cash_percent':
                      itemValues.push(parseFloat(item.cashPercent || 0));
                      break;
                    case 'cash_amount':
                      itemValues.push(parseFloat(item.cashAmount || 0));
                      break;
                    case 'location':
                      itemValues.push(item.location || '');
                      break;
                    case 'unit':
                      itemValues.push(item.unit || 'PCS');
                      break;
                    case 'subtotal':
                    case 'total':
                    case 'amount':
                      itemValues.push(receivedQty * unitCost);
                      break;
                    default:
                      itemValues.push(null);
                  }
                }
              });

              try {
                // Insert the item
                insertItem.run(...itemValues);

                // Update stock - calculate difference from existing
                const oldQty = existingQtyMap.get(item.productId) || 0;
                const stockDifference = receivedQty - oldQty;

                if (stockDifference !== 0) {
                  const stockResult = updateStock.run(stockDifference, item.productId);
                  console.log(`📦 Stock adjustment for product ${item.productId}: ${stockDifference > 0 ? '+' : ''}${stockDifference} (changes: ${stockResult.changes})`);
                }

                itemsProcessed++;
              } catch (itemError) {
                console.error(`❌ Error inserting item ${index + 1}:`, itemError);
                throw new Error(`Failed to insert item ${index + 1}: ${itemError.message}`);
              }
            });

            console.log(`✅ Successfully processed ${itemsProcessed} items`);
          }

          // Calculate and update total if needed
          if (updateData.items && updateData.items.length > 0) {
            const newTotal = updateData.items.reduce((sum: number, item: any) => {
              const qty = parseInt(item.receivedQty || item.quantity || 0);
              const cost = parseFloat(item.unitCost || 0);
              return sum + (qty * cost);
            }, 0);

            if (columnNames.includes('total') && newTotal > 0) {
              const updateTotal = sqlite.prepare('UPDATE purchases SET total = ? WHERE id = ?');
              updateTotal.run(newTotal.toString(), id);
              console.log(`💰 Updated total amount: ${newTotal}`);
            }
          }

          // Get the updated purchase record
          const getUpdatedPurchase = sqlite.prepare('SELECT * FROM purchases WHERE id = ?');
          const updatedPurchase = getUpdatedPurchase.get(id);

          if (!updatedPurchase) {
            throw new Error('Failed to retrieve updated purchase record');
          }

          console.log('✅ Purchase update completed successfully');
          return updatedPurchase;

        } catch (transactionError) {
          console.error('❌ Transaction error:', transactionError);
          throw transactionError;
        }
      });

      // Return success response
      res.json({
        success: true,
        purchase: result,
        message: 'Purchase order updated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error updating purchase:', error);

      // Provide specific error messages
      let errorMessage = 'Failed to update purchase order';
      let userMessage = error.message;

      if (error.message?.includes('SQLITE_CONSTRAINT')) {
        userMessage = 'Data validation error. Please check all required fields.';
      } else if (error.message?.includes('no such table')) {
        userMessage = 'Database table missing. Please contact support.';
      } else if (error.message?.includes('no such column')) {
        userMessage = 'Database schema mismatch. Please refresh and try again.';
      }

      res.status(500).json({ 
        success: false,
        message: errorMessage,
        error: userMessage,
        technical: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.get('/api/purchases', async (req, res) => {
    try {
      console.log('📊 Purchases API endpoint accessed');
      const limit = parseInt(req.query.limit as string || '50');
      const offset = parseInt(req.query.offset as string || '0');

      // Use direct SQLite query for reliability
      const { sqlite } = await import('../db/index.js');

      // Check if purchases table exists
      const tableCheck = sqlite.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='purchases'
      `).get();

      if (!tableCheck) {
        console.log('❌ Purchases table does not exist');
        return res.json([]);
      }

      // Get table structure to handle column variations
      const tableInfo = sqlite.prepare("PRAGMA table_info(purchases)").all();
      const columnNames = tableInfo.map((col: any) => col.name);
      console.log('📋 Available purchase columns:', columnNames);

      // Build dynamic query based on available columns
      const baseColumns = ['id'];
      const optionalColumns = [
        'order_number', 'supplier_id', 'user_id', 'total', 'status',
        'order_date', 'created_at', 'due_date', 'received_date',
        'payment_status', 'paid_amount', 'payment_method'
      ];

      const availableColumns = baseColumns.concat(
        optionalColumns.filter(col => columnNames.includes(col))
      );

      const query = `
        SELECT 
          p.${availableColumns.join(', p.')},
          s.name as supplier_name,
          s.email as supplier_email,
          s.phone as supplier_phone,
          u.name as user_name,
          (SELECT COUNT(*) FROM purchase_items pi WHERE pi.purchase_id = p.id) as item_count
        FROM purchases p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN users u ON p.user_id = u.id
        ORDER BY ${columnNames.includes('created_at') ? 'p.created_at' : 'p.id'} DESC
        LIMIT ? OFFSET ?
      `;

      console.log('🔍 Executing purchases query');
      const purchases = sqlite.prepare(query).all(limit, offset);

      // Format the results to match expected structure
      const formattedPurchases = purchases.map((purchase: any) => ({
        id: purchase.id,
        orderNumber: purchase.order_number || `PO-${purchase.id}`,
        supplierId: purchase.supplier_id,
        userId: purchase.user_id,
        total: purchase.total || '0',
        totalAmount: purchase.total || '0',
        status: purchase.status || 'pending',
        orderDate: purchase.order_date || purchase.created_at,
        createdAt: purchase.created_at,
        dueDate: purchase.due_date,
        receivedDate: purchase.received_date,
        paymentStatus: purchase.payment_status || 'due',
        paidAmount: purchase.paid_amount || '0',
        paymentMethod: purchase.payment_method || 'cash',
        itemCount: purchase.item_count || 0, // Add the actual item count from database
        supplier: purchase.supplier_name ? {
          id: purchase.supplier_id,
          name: purchase.supplier_name,
          email: purchase.supplier_email,
          phone: purchase.supplier_phone
        } : null,
        user: {
          id: purchase.user_id,
          name: purchase.user_name || 'System User'
        },
        items: [] // Will be populated separately if needed
      }));

      console.log(`✅ Found ${formattedPurchases.length} purchases`);
      res.json(formattedPurchases);

    } catch (error) {
      console.error('❌ Error fetching purchases:', error);
      res.status(500).json({ 
        message: 'Failed to fetch purchases',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.get('/api/purchases/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const purchase = await storage.getPurchaseById(id);

      if (!purchase) {
        return res.status(404).json({ message: 'Purchase not found' });
      }

      res.json(purchase);
    } catch (error) {
      console.error('Error fetching purchase:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Update purchase item (for Free Qty updates)
  app.put('/api/purchase-items/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { freeQty } = req.body;

      console.log(`🔄 Updating purchase item ${id} with free qty: ${freeQty}`);

      // Validate input
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: 'Invalid purchase item ID' });
      }

      if (freeQty !== undefined && (isNaN(freeQty) || freeQty < 0)) {
        return res.status(400).json({ error: 'Free quantity must be a non-negative number' });
      }

      // Use direct SQLite query for better control
      const { sqlite } = await import('../db/index.js');

      // Check if item exists
      const existingItem = sqlite.prepare('SELECT * FROM purchase_items WHERE id = ?').get(id);
      if (!existingItem) {
        return res.status(404).json({ error: 'Purchase item not found' });
      }

      // Update the free quantity
      const updateQuery = sqlite.prepare(`
        UPDATE purchase_items 
        SET free_qty = ? 
        WHERE id = ?
      `);

      const result = updateQuery.run(freeQty || 0, id);

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Purchase item not found or no changes made' });
      }

      // If free quantity is added, update product stock
      if (freeQty > 0) {
        const productId = existingItem.product_id;
        const currentFreeQty = existingItem.free_qty || 0;
        const additionalQty = freeQty - currentFreeQty;

        if (additionalQty > 0) {
          // Add the additional free quantity to product stock
          const stockUpdateQuery = sqlite.prepare(`
            UPDATE products 
            SET stock_quantity = stock_quantity + ? 
            WHERE id = ?
          `);
          stockUpdateQuery.run(additionalQty, productId);

          console.log(`✅ Added ${additionalQty} free units to product ${productId} stock`);
        }
      }

      console.log(`✅ Purchase item ${id} updated successfully`);
      res.json({ 
        success: true, 
        message: 'Purchase item updated successfully',
        freeQty: freeQty || 0
      });

    } catch (error) {
      console.error('❌ Error updating purchase item:', error);
      res.status(500).json({ 
        error: 'Failed to update purchase item',
        message: error.message 
      });
    }
  });

  // Update purchase payment status
  app.put('/api/purchases/:id/payment', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { paymentStatus, paymentAmount, totalPaidAmount, paymentMethod, paymentDate, notes } = req.body;

      console.log('🔄 Updating payment status for purchase:', id, req.body);

      // Validate purchase ID
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ 
          error: 'Invalid purchase ID',
          message: 'Purchase ID must be a positive number'
        });
      }

      // Validate payment amount with more detailed checks
      if (paymentAmount !== undefined) {
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount)) {
          return res.status(400).json({ 
            error: 'Invalid payment amount format',
            message: 'Payment amount must be a valid number'
          });
        }
        if (amount <= 0) {
          return res.status(400).json({ 
            error: 'Invalid payment amount',
            message: 'Payment amount must be greater than 0'
          });
        }
        if (amount > 10000000) { // 1 crore limit
          return res.status(400).json({ 
            error: 'Payment amount too large',
            message: 'Payment amount exceeds maximum limit'
          });
        }
      }

      // Validate payment method
      if (paymentMethod && typeof paymentMethod !== 'string') {
        return res.status(400).json({ 
          error: 'Invalid payment method',
          message: 'Payment method must be a text value'
        });
      }

      // Validate payment status
      const validStatuses = ['due', 'paid', 'partial', 'overdue'];
      if (paymentStatus && !validStatuses.includes(paymentStatus)) {
        return res.status(400).json({ 
          error: 'Invalid payment status',
          message: `Payment status must be one of: ${validStatuses.join(', ')}`
        });
      }

      // Use direct SQLite query
      const { sqlite } = await import('../db/index.js');

      // Check if purchase exists
      const existingPurchase = sqlite.prepare('SELECT * FROM purchases WHERE id = ?').get(id);

      if (!existingPurchase) {
        return res.status(404).json({ 
          error: 'Purchase not found',
          message: `No purchase order found with ID ${id}`
        });
      }

      // Get table structure
      const tableInfo = sqlite.prepare("PRAGMA table_info(purchases)").all();
      const columnNames = tableInfo.map((col: any) => col.name);

      // Calculate the new paid amount with validation
      const currentPaidAmount = parseFloat(existingPurchase.paid_amount || '0');
      const newPaymentAmount = parseFloat(paymentAmount || '0');
      const purchaseTotal = parseFloat(existingPurchase.total || existingPurchase.totalAmount || '0');

      // Use totalPaidAmount if provided, otherwise add newPaymentAmount to currentPaidAmount
      let finalPaidAmount = totalPaidAmount !== undefined ? 
        parseFloat(totalPaidAmount.toString()) : 
        currentPaidAmount + newPaymentAmount;

      // Validate the payment amount doesn't create impossible scenarios
      if (finalPaidAmount < 0) {
        finalPaidAmount = 0;
      }

      // Allow overpayment but log it for tracking
      if (finalPaidAmount > purchaseTotal && purchaseTotal > 0) {
        const overpayment = finalPaidAmount - purchaseTotal;
        console.log(`⚠️ Overpayment detected: ${overpayment.toFixed(2)} over total ${purchaseTotal}`);
        // Don't cap overpayments, let them through for business flexibility
      }

      // Calculate payment status based on amounts
      let calculatedPaymentStatus = paymentStatus;

      if (!calculatedPaymentStatus) {
        if (purchaseTotal > 0) {
          const paymentPercentage = (finalPaidAmount / purchaseTotal) * 100;

          if (finalPaidAmount >= purchaseTotal) {
            calculatedPaymentStatus = 'paid';
          } else if (finalPaidAmount > 0) {
            calculatedPaymentStatus = 'partial';
          } else {
            calculatedPaymentStatus = 'due';
          }
        } else {
          calculatedPaymentStatus = finalPaidAmount > 0 ? 'paid' : 'due';
        }
      }

      // Log payment calculation details
      console.log('💰 Payment calculation details:', {
        purchaseId: id,
        purchaseTotal,
        currentPaidAmount,
        newPaymentAmount,
        finalPaidAmount,
        calculatedPaymentStatus,
        paymentPercentage: purchaseTotal > 0 ? Math.round((finalPaidAmount / purchaseTotal) * 100) : 0
      });

      // Prepare update data based on available columns
      const updateData: any = {};

      // Core payment fields that should exist
      if (columnNames.includes('paid_amount')) {
        updateData.paid_amount = finalPaidAmount.toString();
      }

      if (columnNames.includes('payment_status')) {
        updateData.payment_status = calculatedPaymentStatus;
      }

      if (columnNames.includes('payment_method') && paymentMethod) {
        updateData.payment_method = paymentMethod;
      }

      if (columnNames.includes('payment_date') && paymentDate) {
        updateData.payment_date = paymentDate;
      }

      // Always update the updated timestamp if column exists
      if (columnNames.includes('updated_at')) {
        updateData.updated_at = new Date().toISOString();
      }

      // Build dynamic update query
      const updateColumns = Object.keys(updateData);
      if (updateColumns.length === 0) {
        return res.status(400).json({ 
          error: 'No updatable payment columns found',
          message: 'The purchases table is missing required payment tracking columns'
        });
      }

      const setClause = updateColumns.map(col => `${col} = ?`).join(', ');
      const updateValues = updateColumns.map(col => updateData[col]);

      // Execute update
      const updateQuery = `UPDATE purchases SET ${setClause} WHERE id = ?`;
      const updateResult = sqlite.prepare(updateQuery).run(...updateValues, id);

      console.log('💰 Payment update executed:', {
        query: updateQuery,
        values: [...updateValues, id],
        changes: updateResult.changes,
        finalPaidAmount: finalPaidAmount,
        calculatedPaymentStatus: calculatedPaymentStatus
      });

      if (updateResult.changes === 0) {
        return res.status(404).json({ 
          error: 'Update failed',
          message: 'No purchase record was updated. Please check the purchase ID.'
        });
      }

      // Auto-update purchase status to completed if fully paid
      let statusAutoUpdated = false;
      let finalStatus = existingPurchase.status;

      // Determine if status should be auto-updated
      const updatePurchaseStatus = calculatedPaymentStatus === 'paid';
      const newPurchaseStatus = 'completed';

      if (updatePurchaseStatus && (finalPaidAmount >= purchaseTotal)) {
        try {
          const targetStatus = newPurchaseStatus; // Use 'completed' for fully paid
          console.log('🔄 Auto-updating purchase status to:', targetStatus);
          const statusUpdateQuery = 'UPDATE purchases SET status = ? WHERE id = ?';
          const statusResult = sqlite.prepare(statusUpdateQuery).run(targetStatus, id);

          if (statusResult.changes > 0) {
            finalStatus = targetStatus;
            statusAutoUpdated = true;
            console.log('✅ Successfully auto-updated purchase status to', targetStatus);
          } else {
            console.error('❌ Status update failed - no changes made');
          }
        } catch (statusUpdateError) {
          console.error('❌ Error during status auto-update:', statusUpdateError);
        }
      }

      // Get final updated purchase
      const finalPurchase = sqlite.prepare('SELECT * FROM purchases WHERE id = ?').get(id);

      console.log('✅ Payment status updated successfully');
      res.json({ 
        success: true,
        purchase: finalPurchase,
        message: statusAutoUpdated ? 'Payment recorded and purchase completed' : 'Payment status updated successfully',
        paymentRecorded: newPaymentAmount,
        totalPaid: finalPaidAmount,
        paymentStatus: calculatedPaymentStatus,
        statusAutoUpdated: statusAutoUpdated,
        isCompleted: finalStatus === 'completed',
        purchaseTotal: purchaseTotal,
        remainingBalance: Math.max(0, purchaseTotal - finalPaidAmount),
        paymentPercentage: purchaseTotal > 0 ? Math.round((finalPaidAmount / purchaseTotal) * 100) : 100,
        overpayment: finalPaidAmount > purchaseTotal ? finalPaidAmount - purchaseTotal : 0,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error updating payment status:', error);
      res.status(500).json({ 
        error: 'Failed to update payment status',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.put('/api/purchases/:id/status', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, receivedDate } = req.body;

      console.log('🔄 Purchase status update request:', { id, status, receivedDate });

      if (!status) {
        return res.status(400).json({ message: 'Status is required' });
      }

      // Validate status values
      const validStatuses = ['pending', 'ordered', 'received', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        });
      }

      // Use direct SQLite update with column checking
      const { sqlite } = await import('../db/index.js');

      // Check what columns exist in the purchases table
      const tableInfo = sqlite.prepare("PRAGMA table_info(purchases)").all();
      const columnNames = tableInfo.map((col: any) => col.name);
      console.log('📋 Available purchase columns:', columnNames);

      // Check if purchase exists first
      const existingPurchase = sqlite.prepare('SELECT * FROM purchases WHERE id = ?').get(id);
      if (!existingPurchase) {
        return res.status(404).json({ message: 'Purchase not found' });
      }

      // Build dynamic update query based on available columns
      const updateFields = ['status = ?'];
      const updateValues = [status];

      // Add received_date if provided and column exists
      if (receivedDate && columnNames.includes('received_date')) {
        updateFields.push('received_date = ?');
        updateValues.push(receivedDate);
      }

      // Add updated_at if column exists
      if (columnNames.includes('updated_at')) {
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
      }

      updateValues.push(id); // For WHERE clause

      const updateQuery = `UPDATE purchases SET ${updateFields.join(', ')} WHERE id = ?`;
      console.log('🔧 Update query:', updateQuery);
      console.log('📊 Update values:', updateValues);

      const updatePurchase = sqlite.prepare(updateQuery);
      const result = updatePurchase.run(...updateValues);

      if (result.changes === 0) {
        return res.status(404).json({ message: 'Purchase not found or no changes made' });
      }

      // Get updated purchase
      const updatedPurchase = sqlite.prepare('SELECT * FROM purchases WHERE id = ?').get(id);

      console.log('✅ Purchase status updated successfully');
      res.json({
        success: true,
        purchase: updatedPurchase,
        message: `Purchase status updated to ${status}`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error updating purchase status:', error);
      res.status(500).json({ 
        message: 'Failed to update purchase status',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Suppliers API
  app.get('/api/suppliers', async (req, res) => {
    try {
      const suppliers = await storage.listSuppliers();
      res.json(suppliers);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/suppliers/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const supplier = await storage.getSupplierById(id);

      if (!supplier) {
        return res.status(404).json({ message: 'Supplier not found' });
      }

      res.json(supplier);
    } catch (error) {
      console.error('Error fetching supplier:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/suppliers', isAuthenticated, async (req, res) => {
    try {
      console.log('Supplier creation request body:', req.body);

      // Ensure required fields have default values if missing
      const requestData = {
        ...req.body,
        name: req.body.name || '',
        email: req.body.email || null,
        phone: req.body.phone || null,
        mobileNo: req.body.mobileNo || null,
        extensionNumber: req.body.extensionNumber || null,
        faxNo: req.body.faxNo || null,
        contactPerson: req.body.contactPerson || null,
        address: req.body.address || null,
        building: req.body.building || null,
        street: req.body.street || null,
        city: req.body.city || null,
        state: req.body.state || null,
        country: req.body.country || null,
        pinCode: req.body.pinCode || null,
        landmark: req.body.landmark || null,
        taxId: req.body.taxId || null,
        registrationType: req.body.registrationType || null,
        registrationNumber: req.body.registrationNumber || null,
        supplierType: req.body.supplierType || null,
        creditDays: req.body.creditDays || null,
        discountPercent: req.body.discountPercent || null,
        notes: req.body.notes || null,
        status: req.body.status || 'active'
      };

      console.log('Processed supplier data:', requestData);

      // Validate required fields
      if (!requestData.name) {
        return res.status(400).json({ 
          message: 'Supplier name is required' 
        });
      }

      const supplierData = schema.supplierInsertSchema.parse(requestData);
      console.log('Validated supplier data:', supplierData);

      const supplier = await storage.createSupplier(supplierData);
      console.log('Created supplier successfully:', supplier.id);

      res.status(201).json({
        ...supplier,
        message: 'Supplier created successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Validation errors:', JSON.stringify(error.errors, null, 2));
        const detailedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          received: err.received,
          expected: err.expected
        }));
        console.error('Detailed validation errors:', detailedErrors);
        return res.status(400).json({ 
          message: 'Validation failed',
          errors: error.errors, 
          details: detailedErrors 
        });
      }
      console.error('Error creating supplier:', error);
      res.status(500).json({ 
        message: 'Failed to create supplier',
        error: error.message 
      });
    }
  });

  app.put('/api/suppliers/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const supplierData = schema.supplierInsertSchema.parse(req.body);
      const supplier = await storage.updateSupplier(id, supplierData);

      if (!supplier) {
        return res.status(404).json({ message: 'Supplier not found' });
      }

      res.json(supplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error updating supplier:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/suppliers/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log('Routes: Delete supplier request for ID:', id);

      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: 'Invalid supplier ID' });
      }

      const deleted = await storage.deleteSupplier(id);

      if (!deleted) {
        return res.status(404).json({ message: 'Supplier not found' });
      }

      console.log('Routes: Supplier deleted successfully:', id);
      res.json({ 
        message: 'Supplier deleted successfully',
        deletedId: id 
      });
    } catch (error) {
      console.error('Routes: Error deleting supplier:', error);

      // Check for specific error types
      if (error.message.includes('Cannot delete supplier')) {
        return res.status(400).json({ 
          message: error.message,
          type: 'constraint_error'
        });
      }

      res.status(500).json({ 
        message: 'Failed to delete supplier',
        error: error.message 
      });
    }
  });

  // Barcode scan API for POS with offer triggers
  app.post('/api/barcode/scan', isAuthenticated, async (req, res) => {
    try {
      const { barcode, customerId } = req.body;

      if (!barcode) {
        return res.status(400).json({ message: 'Barcode is required' });
      }

      console.log('🔍 Scanning barcode:', barcode, 'for customer:', customerId);

      // Find product by barcode
      const product = await storage.getProductByBarcode(barcode);

      if (!product) {
        return res.status(404).json({ message: 'Product not found for this barcode' });
      }

      // Get applicable offers for this product and customer
      const applicableOffers = await storage.getApplicableOffers(product.id, customerId);

      // Filter offers that are triggered by barcode scan
      const barcodeTriggeredOffers = applicableOffers.filter(offer => 
        offer.triggerType === 'scan' || offer.triggerType === 'barcode_scan'
      );

      console.log('🎁 Found', barcodeTriggeredOffers.length, 'barcode-triggered offers for product:', product.name);

      res.json({
        product,
        triggeredOffers: barcodeTriggeredOffers,
        message: barcodeTriggeredOffers.length > 0 
          ? `Product found with ${barcodeTriggeredOffers.length} special offer(s)!`
          : 'Product found'
      });

    } catch (error) {
      console.error('Error processing barcode scan:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Customers API
  app.get('/api/customers', async (req, res) => {
    try {
      console.log('Fetching customers from database...');

      // Try storage method first
      try {
        const customers = await storage.listCustomers();
        console.log('Storage method returned customers:', customers.length);
        res.json(customers);
        return;
      } catch (storageError) {
        console.log('Storage method failed, trying direct query:', storageError.message);
      }

      // Fallback to direct SQLite query
      const { sqlite } = await import('../db/index.js');

      // Check if customers table exists
      const tableCheck = sqlite.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='customers'
      `).get();

      if (!tableCheck) {
        console.log('Customers table does not exist');
        return res.json([]);
      }

      // Get table structure
      const tableInfo = sqlite.prepare("PRAGMA table_info(customers)").all();
      const columnNames = tableInfo.map(col => col.name);
      console.log("Available columns in customers table:", columnNames);

      // Build query based on available columns
      const selectFields = [
        'id',
        'name',
        'email',
        'phone',
        'address',
        columnNames.includes('tax_id') ? 'tax_id as taxId' : 'NULL as taxId',
        columnNames.includes('credit_limit') ? 'credit_limit as creditLimit' : '0 as creditLimit',
        columnNames.includes('business_name') ? 'business_name as businessName' : 'NULL as businessName',
        columnNames.includes('created_at') ? 'created_at as createdAt' : 'NULL as createdAt'
      ];

      const query = `
        SELECT ${selectFields.join(', ')}
        FROM customers 
        ORDER BY ${columnNames.includes('created_at') ? 'created_at' : 'id'} DESC
      `;

      console.log('Executing customers query:', query);
      const customers = sqlite.prepare(query).all();

      console.log(`Found ${customers.length} customers`);
      res.json(customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  });

  app.get('/api/customers/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomerById(id);

      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }

      res.json(customer);
    } catch (error) {
      console.error('Error fetching customer:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

// Create customer
app.post("/api/customers", async (req, res) => {
  try {
    const { name, email, phone, address, taxNumber, creditLimit, businessName } = req.body;

    console.log("Customer creation request received:", req.body);

    // Validate required fields
    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Customer name is required" });
    }

    // Use direct SQLite insertion to avoid schema mapping issues
    const { sqlite } = await import('../db/index.js');

    // Check what columns exist in the customers table
    const tableInfo = sqlite.prepare("PRAGMA table_info(customers)").all();
    const columnNames = tableInfo.map(col => col.name);
    console.log("Available columns in customers table:", columnNames);

    // Prepare customer data with proper null handling
    const customerData = {
      name: name.trim(),
      email: (email && email.trim() !== "") ? email.trim() : null,
      phone: (phone && phone.trim() !== "") ? phone.trim() : null,
      address: (address && address.trim() !== "") ? address.trim() : null,
      tax_id: (taxNumber && taxNumber.trim() !== "") ? taxNumber.trim() : null,
      credit_limit: (creditLimit && !isNaN(parseFloat(creditLimit))) ? parseFloat(creditLimit) : 0,
      business_name: (businessName && businessName.trim() !== "") ? businessName.trim() : null,
    };

    console.log("Creating customer with processed data:", customerData);

    // Build the insert query dynamically
    let columns = ['name'];
    let placeholders = ['?'];
    let values = [customerData.name];

    // Add optional columns only if they exist in the table and have values
    const optionalFields = [
      { column: 'email', value: customerData.email },
      { column: 'phone', value: customerData.phone },
      { column: 'address', value: customerData.address },
      { column: 'tax_id', value: customerData.tax_id },
      { column: 'credit_limit', value: customerData.credit_limit },
      { column: 'business_name', value: customerData.business_name }
    ];

    optionalFields.forEach(field => {
      if (columnNames.includes(field.column)) {
        columns.push(field.column);
        placeholders.push('?');
        values.push(field.value);
      }
    });

    // Add created_at if it exists
    if (columnNames.includes('created_at')) {
      columns.push('created_at');
      placeholders.push('CURRENT_TIMESTAMP');
    }

    // Build the final query
    const insertQuery = `
      INSERT INTO customers (${columns.join(', ')}) 
      VALUES (${placeholders.join(', ')})
    `;

    console.log("Final insert query:", insertQuery);
    console.log("Values to insert:", values);

    const insertCustomer = sqlite.prepare(insertQuery);
    const result = insertCustomer.run(...values);

    // Get the created customer with proper field mapping
    const getCustomerQuery = `
      SELECT 
        id,
        name,
        email,
        phone,
        address,
        ${columnNames.includes('tax_id') ? 'tax_id as taxId' : 'NULL as taxId'},
        ${columnNames.includes('credit_limit') ? 'credit_limit as creditLimit' : '0 as creditLimit'},
        ${columnNames.includes('business_name') ? 'business_name as businessName' : 'NULL as businessName'},
        ${columnNames.includes('created_at') ? 'created_at as createdAt' : 'NULL as createdAt'}
      FROM customers 
      WHERE id = ?
    `;

    const newCustomer = sqlite.prepare(getCustomerQuery).get(result.lastInsertRowid);

    console.log("Customer created successfully:", newCustomer);
    res.status(201).json({
      ...newCustomer,
      message: "Customer created successfully"
    });

  } catch (error) {
    console.error("Error creating customer:", error);
    res.status(500).json({ 
      error: "Failed to create customer", 
      details: error.message 
    });
  }
});

  app.put('/api/customers/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customerData = schema.customerInsertSchema.parse(req.body);
      const customer = await storage.updateCustomer(id, customerData);

      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }

      res.json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error updating customer:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/customers/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteCustomer(id);

      if (!deleted) {
        return res.status(404).json({ message: 'Customer not found' });
      }

      res.json({ message: 'Customer deleted successfully' });
    } catch (error) {
      console.error('Error deleting customer:', error);

      if (error instanceof Error) {
        if (error.message.includes('FOREIGN KEY constraint failed')) {
          return res.status(400).json({ 
            message: 'Cannot delete customer: This customer has associated sales or loyalty records. Customer will be deactivated instead.' 
          });
        }
        if (error.message.includes('associated sales or loyalty records')) {
          return res.status(200).json({ 
            message: 'Customer deactivated: Customer had related records and has been safely deactivated instead of deleted.'           });
        }
      }

      res.status(500).json({ message: 'Failed to delete customer. Please try again.' });
    }
  });

  // Users API (Admin only)
  app.get('/api/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await storage.listUsers();
      // Remove passwords from response
      const safeUsers = users.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      res.json(safeUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/users/:id', isAuthenticated, isAdminOrManager, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUserById(id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Remove password from response
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userData = schema.userInsertSchema.parse(req.body);

      // Check if username already exists (if provided)
      if (userData.username) {
        const existingUser = await storage.getUserByUsername(userData.username);
        if (existingUser) {
          return res.status(400).json({ message: 'Username already exists' });
        }
      }

      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const userToCreate = {
        ...userData,
        password: hashedPassword,
        active: userData.active !== false
      };

      const user = await storage.createUser(userToCreate);

      // Remove password from response
      const { password, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating user:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/users/:id', isAuthenticated, isAdminOrManager, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userData = req.body;

      // Don't allow updating password through this endpoint
      if (userData.password) {
        delete userData.password;
      }

      const user = await storage.updateUser(id, userData);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Remove password from response
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/users/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Don't allow deleting yourself
      if ((req.user as any).id === id) {
        return res.status(400).json({ message: 'Cannot delete your own account' });
      }

      const deleted = await storage.deleteUser(id);

      if (!deleted) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Database health check endpoint
  app.get('/api/health', async (req, res) => {
    try {
      const { sqlite } = await import('../db/index.js');

      // Test database connectivity
      const result = sqlite.prepare('SELECT 1 as test').get();

      // Test if products table exists
      const tablesCheck = sqlite.prepare(`
        SELECT COUNT(*) as count FROM sqlite_master 
        WHERE type='table' AND name IN ('products', 'sales', 'customers')
      `).get();

      res.json({
        status: 'healthy',
        database: 'connected',
        tables: tablesCheck.count >= 3 ? 'available' : 'missing',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(500).json({
        status: 'unhealthy',
        database: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Dashboard stats API
  app.get('/api/dashboard/stats', async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Sales chart data API
  app.get('/api/dashboard/sales-chart', async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const salesData = await storage.getDailySalesData(days);
      res.json(salesData);
    } catch (error) {
      console.error('Error fetching sales chart data:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Top selling products API
  app.get('/api/reports/top-selling-products', async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const limit = parseInt(req.query.limit as string) || 5;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const topProducts = await storage.getTopSellingProducts(limit, startDate);
      res.json(topProducts);
    } catch (error) {
      // Adding profit analysis API endpoint to provide detailed profit insights.
      console.error('Error fetching top selling products:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Label Templates API
  app.get('/api/label-templates', isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getLabelTemplates();

      // Map database field names to frontend field names for all templates
      const mappedTemplates = templates.map(template => {
        const mappedTemplate = {
          ...template,
          font_size: template.fontSize || template.font_size,
          product_name_font_size: template.productNameFontSize || template.product_name_font_size,
          include_barcode: template.includeBarcode || template.include_barcode,
          include_price: template.includePrice || template.include_price,
          include_description: template.includeDescription || template.include_description,
          include_mrp: template.includeMRP || template.include_mrp,
          include_weight: template.includeWeight || template.include_weight,
          include_hsn: template.includeHSN || template.include_hsn,
          include_manufacturing_date: template.includeManufacturingDate || template.include_manufacturing_date,
          include_expiry_date: template.includeExpiryDate || template.include_expiry_date,
          barcode_position: template.barcodePosition || template.barcode_position,
          border_style: template.borderStyle || template.border_style,
          border_width: template.borderWidth || template.border_width,
          background_color: template.backgroundColor || template.background_color,
          text_color: template.textColor || template.text_color,
          custom_css: template.customCSS || template.custom_css,
          store_title: template.storeTitle || template.store_title,
          is_default: template.isDefault || template.is_default,
          is_active: template.isActive || template.is_active,
          created_at: template.createdAt || template.created_at,
          updated_at: template.updatedAt || template.updated_at
        };

        // Remove the original camelCase fields to avoid confusion
        delete mappedTemplate.fontSize;
        delete mappedTemplate.includeBarcode;
        delete mappedTemplate.includePrice;
        delete mappedTemplate.includeDescription;
        delete mappedTemplate.includeMRP;
        delete mappedTemplate.includeWeight;
        delete mappedTemplate.includeHSN;
        delete mappedTemplate.includeManufacturingDate;
        delete mappedTemplate.includeExpiryDate;
        delete mappedTemplate.barcodePosition;
        delete mappedTemplate.borderStyle;
        delete mappedTemplate.borderWidth;
        delete mappedTemplate.backgroundColor;
        delete mappedTemplate.textColor;
        delete mappedTemplate.customCSS;
        delete mappedTemplate.storeTitle;
        delete mappedTemplate.isDefault;
        delete mappedTemplate.isActive;
        delete mappedTemplate.createdAt;
        delete mappedTemplate.updatedAt;

        return mappedTemplate;
      });

      res.json(mappedTemplates);
    } catch (error) {
      console.error('Error fetching label templates:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/label-templates', isAuthenticated, async (req, res) => {
    try {
      const requestData = req.body;

      // Validate required fields
      if (!requestData.name || !requestData.width || !requestData.height) {
        return res.status(400).json({ 
          message: 'Name, width, and height are required fields' 
        });
      }

      // Map frontend field names to storage field names
      const templateData = {
        name: requestData.name,
        description: requestData.description,
        width: requestData.width,
        height: requestData.height,
        fontSize: requestData.font_size || 12,
        productNameFontSize: requestData.product_name_font_size || 18,
        includeBarcode: requestData.include_barcode,
        includePrice: requestData.include_price,
        includeDescription: requestData.include_description,
        includeMRP: requestData.include_mrp,
        includeWeight: requestData.include_weight,
        includeHSN: requestData.include_hsn,
        includeManufacturingDate: requestData.include_manufacturing_date,
        includeExpiryDate: requestData.include_expiry_date,
        barcodePosition: requestData.barcode_position,
        borderStyle: requestData.border_style,
        borderWidth: requestData.border_width,
        backgroundColor: requestData.background_color,
        textColor: requestData.text_color,
        customCSS: requestData.custom_css,
        storeTitle: requestData.store_title,
        isDefault: requestData.is_default,
        isActive: requestData.is_active,
        orientation: requestData.orientation
      };

      // Check for duplicate template names
      const existingTemplates = await storage.getLabelTemplates();
      const duplicateName = existingTemplates.find(t => t.name.toLowerCase() === templateData.name.toLowerCase());

      if (duplicateName) {
        return res.status(400).json({ 
          message: `Template name "${templateData.name}" already exists. Please use a different name.` 
        });
      }

      const template = await storage.createLabelTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      console.error('Error creating label template:', error);

      // Handle specific SQLite constraint errors
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ 
          message: 'Template name already exists. Please choose a different name.' 
        });
      }

      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/label-templates/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.getLabelTemplateById(id);

      if (!template) {
        return res.status(404).json({ message: 'Label template not found' });
      }

      // Map database field names to frontend field names
      const responseTemplate = {
        ...template,
        font_size: template.fontSize || template.font_size,
        product_name_font_size: template.productNameFontSize || template.product_name_font_size,
        include_barcode: template.includeBarcode || template.include_barcode,
        include_price: template.includePrice || template.include_price,
        include_description: template.includeDescription || template.include_description,
        include_mrp: template.includeMRP || template.include_mrp,
        include_weight: template.includeWeight || template.include_weight,
        include_hsn: template.includeHSN || template.include_hsn,
        include_manufacturing_date: template.includeManufacturingDate || template.include_manufacturing_date,
        include_expiry_date: template.includeExpiryDate || template.include_expiry_date,
        barcode_position: template.barcodePosition || template.barcode_position,
        border_style: template.borderStyle || template.border_style,
        border_width: template.borderWidth || template.border_width,
        background_color: template.backgroundColor || template.background_color,
        text_color: template.textColor || template.text_color,
        custom_css: template.customCSS || template.custom_css,
        store_title: template.storeTitle || template.store_title,
        is_default: template.isDefault || template.is_default,
        is_active: template.isActive || template.is_active,
        created_at: template.createdAt || template.created_at,
        updated_at: template.updatedAt || template.updated_at
      };

      // Remove the original camelCase fields to avoid confusion
      delete responseTemplate.fontSize;
      delete responseTemplate.includeBarcode;
      delete responseTemplate.includePrice;
      delete responseTemplate.includeDescription;
      delete responseTemplate.includeMRP;
      delete responseTemplate.includeWeight;
      delete responseTemplate.includeHSN;
      delete responseTemplate.includeManufacturingDate;
      delete responseTemplate.includeExpiryDate;
      delete responseTemplate.barcodePosition;
      delete responseTemplate.borderStyle;
      delete responseTemplate.borderWidth;
      delete responseTemplate.backgroundColor;
      delete responseTemplate.textColor;
      delete responseTemplate.customCSS;
      delete responseTemplate.storeTitle;
      delete responseTemplate.isDefault;
      delete responseTemplate.isActive;
      delete responseTemplate.createdAt;
      delete responseTemplate.updatedAt;

      res.json(responseTemplate);
    } catch (error) {
      console.error('Error fetching label template:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/label-templates/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const requestData = req.body;

      console.log('🔧 PUT request received for template ID:', id);
      console.log('📦 Request body received:', requestData);
      console.log('🎯 Barcode dimensions in request:', { 
        barcode_width: requestData.barcode_width, 
        barcode_height: requestData.barcode_height,
        barcodeWidth: requestData.barcodeWidth,
        barcodeHeight: requestData.barcodeHeight
      });

      console.log('📅 Manufacturing/Expiry date fields in request:', {
        include_manufacturing_date: requestData.include_manufacturing_date,
        include_expiry_date: requestData.include_expiry_date,
        includeManufacturingDate: requestData.includeManufacturingDate,
        includeExpiryDate: requestData.includeExpiryDate
      });

      // Map frontend field names to storage field names
      const templateData = {
        name: requestData.name,
        description: requestData.description,
        width: requestData.width,
        height: requestData.height,
        fontSize: requestData.font_size,
        productNameFontSize: requestData.product_name_font_size,
        includeBarcode: requestData.include_barcode,
        includePrice: requestData.include_price,
        includeDescription: requestData.include_description,
        includeMRP: requestData.include_mrp,
        includeWeight: requestData.include_weight,
        includeHSN: requestData.include_hsn,
        includeManufacturingDate: requestData.include_manufacturing_date,
        includeExpiryDate: requestData.include_expiry_date,
        barcodePosition: requestData.barcode_position,
        barcodeWidth: requestData.barcode_width,
        barcodeHeight: requestData.barcode_height,
        borderStyle: requestData.border_style,
        borderWidth: requestData.border_width,
        backgroundColor: requestData.background_color,
        textColor: requestData.text_color,
        customCSS: requestData.custom_css,
        storeTitle: requestData.store_title,
        isDefault: requestData.is_default,
        isActive: requestData.is_active,
        orientation: requestData.orientation
      };

      const updatedTemplate = await storage.updateLabelTemplate(id, templateData);

      if (!updatedTemplate) {
        return res.status(404).json({ message: 'Label template not found' });
      }

      res.json(updatedTemplate);
    } catch (error) {
      console.error('Error updating label template:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/label-templates/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteLabelTemplate(id);

      if (!deleted) {
        return res.status(404).json({ message: 'Label template not found' });
      }

      res.json({ message: 'Label template deleted successfully' });
    } catch (error) {
      console.error('Error deleting label template:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Print Jobs API
  app.post('/api/print-jobs', isAuthenticated, async (req, res) => {
    try {
      const jobData = {
        ...req.body,
        userId: (req.user as any).id
      };

      // Validate required fields
      if (!jobData.templateId || !jobData.productIds || !Array.isArray(jobData.productIds) || jobData.productIds.length === 0) {
        return res.status(400).json({ 
          message: 'Template ID and product IDs are required' 
        });
      }

      // Calculate total labels
      jobData.totalLabels = jobData.productIds.length * (jobData.copies || 1);

      const printJob = await storage.createPrintJob(jobData);
      res.status(201).json(printJob);
    } catch (error) {
      console.error('Error creating print job:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/print-jobs', isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const printJobs = await storage.getPrintJobs(limit);
      res.json(printJobs);
    } catch (error) {
      console.error('Error fetching print jobs:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/print-jobs/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const printJob = await storage.getPrintJobById(id);

      if (!printJob) {
        return res.status(404).json({ message: 'Print job not found' });
      }

      res.json(printJob);
    } catch (error) {
      console.error('Error fetching print job:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/print-jobs/:id/status', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ message: 'Status is required' });
      }

      const validStatuses = ['pending', 'printing', 'completed', 'failed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        });
      }

      const updated = await storage.updatePrintJobStatus(id, status);

      if (!updated) {
        return res.status(404).json({ message: 'Print job not found' });
      }

      res.json({ message: 'Print job status updated successfully' });
    } catch (error) {
      console.error('Error updating print job status:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Customer billing analytics API
  app.get('/api/reports/customer-billing', async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const customerBilling = await storage.getCustomerBillingData(startDate);
      res.json(customerBilling);
    } catch (error) {
      console.error('Error fetching customer billing data:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Customer transaction history API
  app.get('/api/reports/customer-transactions', async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const transactions = await storage.getCustomerTransactionHistory(startDate);
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching customer transaction history:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Customer demographics API
  app.get('/api/reports/customer-demographics', async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const demographics = await storage.getCustomerDemographics(startDate);
      res.json(demographics);
    } catch (error) {
      console.error('Error fetching customer demographics:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Payment method analytics API
  app.get('/api/reports/payment-analytics', async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const paymentAnalytics = await storage.getPaymentAnalytics(startDate);
      res.json(paymentAnalytics);
    } catch (error) {
      console.error('Error fetching payment analytics:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Business Settings API endpoints
  app.get('/api/settings/business', async (req, res) => {
    try {
      console.log('🏢 Fetching business settings');

      const { sqlite } = await import('../db/index.js');

      // Get business-related settings
      const businessKeys = [
        'businessName', 'address', 'phone', 'email', 'gstNumber', 'logo', 
        'timezone', 'currency'
      ];

      const settings = {};
      const getSettingQuery = sqlite.prepare('SELECT value FROM settings WHERE key = ?');

      businessKeys.forEach(key => {
        const result = getSettingQuery.get(key);
        if (result) {
          try {
            settings[key] = JSON.parse(result.value);
          } catch {
            settings[key] = result.value;
          }
        }
      });

      // Apply defaults
      const defaultSettings = {
        businessName: 'M MART',
        address: '123 Business Street, City, State',
        phone: '+91-9876543210',
        email: 'contact@mmart.com',
        gstNumber: '33GSPDB3311F1ZZ',
        logo: '',
        timezone: 'Asia/Kolkata',
        currency: 'INR'
      };

      const finalSettings = { ...defaultSettings, ...settings };
      console.log('🏢 Business settings retrieved');

      res.json(finalSettings);
    } catch (error) {
      console.error('❌ Error fetching business settings:', error);
      res.status(500).json({ error: 'Failed to fetch business settings' });
    }
  });

  app.post('/api/settings/business', async (req, res) => {
    try {
      console.log('💾 Saving business settings:', req.body);

      const { sqlite } = await import('../db/index.js');

      // Ensure settings table exists
      sqlite.prepare(`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT NOT NULL UNIQUE,
          value TEXT NOT NULL,
          updated_at DATETIME
        )
      `).run();

      const upsertSetting = sqlite.prepare(`
        INSERT INTO settings (key, value, updated_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET 
          value = excluded.value,
          updated_at = CURRENT_TIMESTAMP
      `);

      const transaction = sqlite.transaction((settings) => {
        Object.entries(settings).forEach(([key, value]) => {
          const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value.toString();
          upsertSetting.run(key, serializedValue);
        });
      });

      transaction(req.body);

      console.log('✅ Business settings saved successfully');
      res.json({ 
        success: true, 
        message: 'Business settings saved successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error saving business settings:', error);
      res.status(500).json({ 
        error: 'Failed to save business settings',
        message: error.message 
      });
    }
  });

  // POS Settings API endpoints
  app.get('/api/settings/pos', async (req, res) => {
    try {
      console.log('🛒 Fetching POS settings');

      const { sqlite } = await import('../db/index.js');

      const posKeys = [
        'quickSaleMode', 'barcodeScanning', 'customerRequired', 'discountEnabled',
        'taxCalculation', 'roundingMethod', 'defaultPaymentMethod'
      ];

      const settings = {};
      const getSettingQuery = sqlite.prepare('SELECT value FROM settings WHERE key = ?');

      posKeys.forEach(key => {
        const result = getSettingQuery.get(key);
        if (result) {
          try {
            settings[key] = JSON.parse(result.value);
          } catch {
            settings[key] = result.value;
          }
        }
      });

      const defaultSettings = {
        quickSaleMode: false,
        barcodeScanning: true,
        customerRequired: false,
        discountEnabled: true,
        taxCalculation: 'inclusive',
        roundingMethod: 'round',
        defaultPaymentMethod: 'cash'
      };

      const finalSettings = { ...defaultSettings, ...settings };
      console.log('🛒 POS settings retrieved');

      res.json(finalSettings);
    } catch (error) {
      console.error('❌ Error fetching POS settings:', error);
      res.status(500).json({ error: 'Failed to fetch POS settings' });
    }
  });

  app.post('/api/settings/pos', async (req, res) => {
    try {
      console.log('💾 Saving POS settings:', req.body);

      const { sqlite } = await import('../db/index.js');

      const upsertSetting = sqlite.prepare(`
        INSERT INTO settings (key, value, updated_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET 
          value = excluded.value,
          updated_at = CURRENT_TIMESTAMP
      `);

      const transaction = sqlite.transaction((settings) => {
        Object.entries(settings).forEach(([key, value]) => {
          const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value.toString();
          upsertSetting.run(key, serializedValue);
        });
      });

      transaction(req.body);

      console.log('✅ POS settings saved successfully');
      res.json({ 
        success: true, 
        message: 'POS settings saved successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error saving POS settings:', error);
      res.status(500).json({ 
        error: 'Failed to save POS settings',
        message: error.message 
      });
    }
  });

  // Receipt Settings API endpoints
  app.get('/api/settings/receipt', async (req, res) => {
    try {
      console.log('🔧 Fetching receipt settings');

      const { sqlite } = await import('../db/index.js');

      // Ensure settings table exists with proper schema
      sqlite.prepare(`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT NOT NULL UNIQUE,
          value TEXT NOT NULL,
          updated_at DATETIME
        )
      `).run();

      // Check if updated_at column exists, add if missing
      const tableInfo = sqlite.prepare("PRAGMA table_info(settings)").all();
      const hasUpdatedAt = tableInfo.some((col: any) => col.name === 'updated_at');

      if (!hasUpdatedAt) {
        // Add column without default, then update existing records
        sqlite.prepare('ALTER TABLE settings ADD COLUMN updated_at DATETIME').run();
        sqlite.prepare('UPDATE settings SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL').run();
        console.log('Added updated_at column to settings table');
      }

      // Get all receipt-related settings
      const receiptKeys = [
        'businessName', 'businessAddress', 'phoneNumber', 'taxId', 'receiptFooter',
        'paperWidth', 'showLogo', 'logoUrl', 'autoPrint', 'showCustomerDetails', 'showItemSKU',
        'showMRP', 'showSavings', 'headerStyle', 'boldTotals', 'separatorStyle',
        'thermalOptimized', 'fontSize', 'fontFamily'
      ];

      const settings = {};
      const getSettingQuery = sqlite.prepare('SELECT value FROM settings WHERE key = ?');

      receiptKeys.forEach(key => {
        const result = getSettingQuery.get(key);
        if (result) {
          try {
            // Try to parse as JSON first (for boolean/object values)
            settings[key] = JSON.parse(result.value);
          } catch {
            // If not JSON, use as string
            settings[key] = result.value;
          }
        }
      });

      // Apply defaults for missing settings
      const defaultSettings = {
        businessName: 'M MART',
        businessAddress: '123 Business Street, City, State',
        phoneNumber: '+91-9876543210',
        taxId: '33GSPDB3311F1ZZ',
        receiptFooter: 'Thank you for shopping with us!',
        paperWidth: '80mm',
        showLogo: true,
        logoUrl: '', // Default empty logo URL
        autoPrint: true,
        showCustomerDetails: true,
        showItemSKU: true,
        showMRP: true,
        showSavings: true,
        headerStyle: 'centered',
        boldTotals: true,
        separatorStyle: 'solid',
        thermalOptimized: true,
        fontSize: 'medium',
        fontFamily: 'courier'
      };

      const finalSettings = { ...defaultSettings, ...settings };
      console.log('📄 Receipt settings retrieved:', Object.keys(finalSettings));

      res.json(finalSettings);
    } catch (error) {
      console.error('❌ Error fetching receipt settings:', error);
      res.status(500).json({ error: 'Failed to fetch receipt settings' });
    }
  });

  app.post('/api/settings/receipt', async (req, res) => {
    try {
      console.log('💾 Saving receipt settings:', req.body);

      const { sqlite } = await import('../db/index.js');

      // Ensure settings table exists with proper schema
      sqlite.prepare(`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT NOT NULL UNIQUE,
          value TEXT NOT NULL,
          updated_at DATETIME
        )
      `).run();

      // Check if updated_at column exists, add if missing
      const tableInfo = sqlite.prepare("PRAGMA table_info(settings)").all();
      const hasUpdatedAt = tableInfo.some((col: any) => col.name === 'updated_at');

      if (!hasUpdatedAt) {
        // Add column without default, then update existing records
        sqlite.prepare('ALTER TABLE settings ADD COLUMN updated_at DATETIME').run();
        sqlite.prepare('UPDATE settings SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL').run();
        console.log('Added updated_at column to settings table');
      }

      // Prepare upsert statement
      const upsertSetting = sqlite.prepare(`
        INSERT INTO settings (key, value, updated_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET 
          value = excluded.value,
          updated_at = CURRENT_TIMESTAMP
      `);

      // Save each setting
      const transaction = sqlite.transaction((settings) => {
        Object.entries(settings).forEach(([key, value]) => {
          const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value.toString();
          upsertSetting.run(key, serializedValue);
        });
      });

      transaction(req.body);

      console.log('✅ Receipt settings saved successfully');
      res.json({ 
        success: true, 
        message: 'Receipt settings saved successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error saving receipt settings:', error);
      res.status(500).json({ 
        error: 'Failed to save receipt settings',
        message: error.message 
      });
    }
  });

  // Comprehensive sales test endpoint
  app.get('/api/sales/test', async (req, res) => {
    try {
      console.log('🧪 Sales test endpoint accessed');

      const testResults = {
        timestamp: new Date().toISOString(),
        authentication: {
          isAuthenticated: req.isAuthenticated(),
          user: req.user ? { id: (req.user as any).id, name: (req.user as any).name } : null
        },
        databaseTests: {},
        apiTests: {},
        recommendations: []
      };

      // Test 1: Database connection and table existence
      try {
        const { sqlite } = await import('../db/index.js');

        // Check if sales table exists
        const tableCheck = sqlite.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name='sales'
        `).get();

        testResults.databaseTests.salesTableExists = !!tableCheck;

        if (tableCheck) {
          // Count total sales
          const totalCount = sqlite.prepare('SELECT COUNT(*) as count FROM sales').get();
          testResults.databaseTests.totalSalesCount = totalCount.count;

          // Get recent sales directly
          const recentSales = sqlite.prepare(`
            SELECT s.*, c.name as customerName 
            FROM sales s 
            LEFT JOIN customers c ON s.customerId = c.id 
            ORDER BY s.createdAt DESC 
            LIMIT 5
          `).all();

          testResults.databaseTests.recentSalesData = recentSales;
          testResults.databaseTests.recentSalesCount = recentSales.length;

          // Check if sales were created today
          const today = new Date().toISOString().split('T')[0];
          const todaysSales = sqlite.prepare(`
            SELECT COUNT(*) as count FROM sales 
            WHERE DATE(createdAt) = ?
          `).get(today);

          testResults.databaseTests.todaysSalesCount = todaysSales.count;
        }
      } catch (dbError) {
        testResults.databaseTests.error = dbError.message;
      }

      // Test 2: Storage layer methods
      try {
        const storageResults = await storage.listSales(10, 0);
        testResults.apiTests.storageListSales = {
          success: true,
          count: storageResults?.length || 0,
          sample: storageResults?.slice(0, 2) || []
        };
      } catch (storageError) {
        testResults.apiTests.storageListSales = {
          success: false,
          error: storageError.message
        };
      }

      // Generate recommendations
      if (testResults.databaseTests.totalSalesCount === 0) {
        testResults.recommendations.push('No sales data found - try creating a test sale via POS');
      }

      if (!testResults.databaseTests.salesTableExists) {
        testResults.recommendations.push('Sales table missing - run database migration');
      }

      if (!testResults.authentication.isAuthenticated) {
        testResults.recommendations.push('User not authenticated - may affect data access');
      }

      if (testResults.databaseTests.totalSalesCount > 0 && testResults.apiTests.storageListSales?.count === 0) {
        testResults.recommendations.push('Data exists but storage layer not returning it - check storage.listSales method');
      }

      console.log('🧪 Test results:', testResults);
      res.json(testResults);

    } catch (error) {
      console.error('💥 Error in sales test endpoint:', error);
      res.status(500).json({ 
        error: 'Test endpoint failed',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Tax Management API - HSN Code Lookup
  app.get('/api/tax/hsn-codes/:hsnCode/rates', async (req, res) => {
    try {
      const hsnCode = req.params.hsnCode;
      console.log('🔍 Looking up tax rates for HSN code:', hsnCode);

      const { sqlite } = await import('../db/index.js');

      // Look up HSN code in our tax database
      const hsnQuery = sqlite.prepare(`
        SELECT 
          hc.hsn_code,
          hc.description,
          hc.cgst_rate,
          hc.sgst_rate,
          hc.igst_rate,
          hc.cess_rate
        FROM hsn_code_mappings hc
        WHERE hc.hsn_code = ? OR hc.hsn_code LIKE ?
        ORDER BY LENGTH(hc.hsn_code) DESC
        LIMIT 1
      `);

      const hsnResult = hsnQuery.get(hsnCode, hsnCode + '%');

      if (hsnResult) {
        console.log('✅ Found HSN code in database:', hsnResult);
        res.json({
          hsnCode: hsnResult.hsn_code,
          description: hsnResult.description,
          cgst: hsnResult.cgst_rate?.toString() || "0",
          sgst: hsnResult.sgst_rate?.toString() || "0", 
          igst: hsnResult.igst_rate?.toString() || "0",
          cess: hsnResult.cess_rate?.toString() || "0"
        });
      } else {
        // Fallback: Return default rates based on HSN prefix patterns
        console.log('❌ HSN code not found in database, using fallback');
        res.status(404).json({ 
          message: 'HSN code not found in database',
          hsnCode: hsnCode
        });
      }

    } catch (error) {
      console.error('Error looking up HSN code:', error);
      res.status(500).json({ 
        message: 'Failed to lookup HSN code',
        error: error.message 
      });
    }
  });

  // Tax Management API - Get all tax configurations
  app.get('/api/tax/configurations', async (req, res) => {
    try {
      console.log('📋 Fetching tax configurations');
      const { sqlite } = await import('../db/index.js');

      const taxConfigs = sqlite.prepare(`
        SELECT * FROM tax_configurations ORDER BY created_at DESC
      `).all();

      res.json(taxConfigs);
    } catch (error) {
      console.error('Error fetching tax configurations:', error);
      res.status(500).json({ 
        message: 'Failed to fetch tax configurations',
        error: error.message 
      });
    }
  });

  // Tax Management API - Get all tax categories
  app.get('/api/tax/categories', async (req, res) => {
    try {
      console.log('📋 Fetching tax categories');
      const { sqlite } = await import('../db/index.js');

      const taxCategories = sqlite.prepare(`
        SELECT * FROM tax_categories ORDER BY name
      `).all();

      res.json(taxCategories);
    } catch (error) {
      console.error('Error fetching tax categories:', error);
      res.status(500).json({ 
        message: 'Failed to fetch tax categories',
        error: error.message 
      });
    }
  });

  // Sales debug endpoint (kept for compatibility)
  app.get('/api/sales/debug', async (req, res) => {
    try {
      console.log('Sales debug endpoint accessed');

      // Check authentication status
      const authStatus = {
        isAuthenticated: req.isAuthenticated(),
        user: req.user ? { id: (req.user as any).id, name: (req.user as any).name } : null
      };

      // Try different sales queries
      let salesCount = 0;
      let recentSalesCount = 0;
      let salesSample = null;

      try {
        const allSales = await storage.listSales(100, 0);
        salesCount = allSales?.length || 0;
        salesSample = allSales?.slice(0, 2) || [];
      } catch (err) {
        console.error('Error getting all sales:', err);
      }

      try {
        const recentSales = await storage.getRecentSales(10);
        recentSalesCount = recentSales?.length || 0;
      } catch (err) {
        console.error('Error getting recent sales:', err);
      }

      const debugInfo = {
        timestamp: new Date().toISOString(),
        authentication: authStatus,
        salesStats: {
          totalSalesCount: salesCount,
          recentSalesCount: recentSalesCount,
          sampleSales: salesSample
        },
        endpoints: {
          '/api/sales': 'Main sales endpoint',
          '/api/sales/recent': 'Recent sales endpoint',
          '/api/sales/test': 'Comprehensive test endpoint',
          '/api/dashboard/stats': 'Dashboard stats endpoint'
        }
      };

      console.log('Debug info compiled:', debugInfo);
      res.json(debugInfo);
    } catch (error) {
      console.error('Error in sales debug endpoint:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Reports routes
  app.get("/api/reports/sales-overview", async (req, res) => {
    try {
      const { period = '30' } = req.query;
      const days = parseInt(period as string, 10);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const salesData = await db
        .select({
          date: sql<string>`DATE(${sales.createdAt})`,
          total: sql<number>`SUM(${sales.total})`,
          count: sql<number>`COUNT(*)`,
        })
        .from(sales)
        .where(gte(sales.createdAt, startDate.toISOString()))
        .groupBy(sql`DATE(${sales.createdAt})`)
        .orderBy(sql`DATE(${sales.createdAt})`);

      const totalSales = await db
        .select({
          total: sql<number>`SUM(${sales.total})`,
          count: sql<number>`COUNT(*)`,
        })
        .from(sales)
        .where(gte(sales.createdAt, startDate.toISOString()));

      res.json({
        salesData,
        summary: totalSales[0] || { total: 0, count: 0 }
      });
    } catch (error) {
      console.error("Error fetching sales overview:", error);
      res.status(500).json({ error: "Failed to fetch sales overview" });
    }
  });

  // Profit analysis endpoint
  app.get("/api/reports/profit-analysis", async (req, res) => {
    try {
      console.log('🔍 Profit analysis endpoint accessed');
      const { days = '30', filter = 'all', category = 'all' } = req.query;
      const daysPeriod = parseInt(days as string, 10);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysPeriod);

      // Use direct SQLite queries for reliable data access
      const { sqlite } = await import('../db/index.js');

      // Get sales data with product details and costs
      const salesQuery = sqlite.prepare(`
        SELECT 
          s.id as sale_id,
          DATE(s.created_at) as sale_date,
          s.total as sale_total,
          si.product_id,
          si.quantity,
          si.unit_price,
          si.subtotal,
          p.name as product_name,
          p.sku as product_sku,
          p.cost as product_cost,
          c.name as category_name
        FROM sales s
        INNER JOIN sale_items si ON s.id = si.sale_id
        INNER JOIN products p ON si.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE s.created_at >= ?
        ORDER BY s.created_at DESC
      `);

      const salesData = salesQuery.all(startDate.toISOString());
      console.log(`📊 Found ${salesData.length} sale items for profit analysis`);

      // Calculate metrics from real data
      let totalRevenue = 0;
      let totalCost = 0;
      const dailyData: Record<string, { revenue: number; cost: number; profit: number }> = {};
      const productProfits: Record<string, any> = {};
      const categoryProfits: Record<string, any> = {};

      salesData.forEach((item: any) => {
        const revenue = parseFloat(item.subtotal || '0');
        const unitCost = parseFloat(item.product_cost || '0');
        const quantity = parseInt(item.quantity || '1');
        const cost = unitCost * quantity;
        const profit = revenue - cost;

        totalRevenue += revenue;
        totalCost += cost;

        // Daily trends
        const date = item.sale_date;
        if (!dailyData[date]) {
          dailyData[date] = { revenue: 0, cost: 0, profit: 0 };
        }
        dailyData[date].revenue += revenue;
        dailyData[date].cost += cost;
        dailyData[date].profit += profit;

        // Product profitability
        const productKey = item.product_id.toString();
        if (!productProfits[productKey]) {
          productProfits[productKey] = {
            id: item.product_id,
            name: item.product_name,
            sku: item.product_sku,
            category: item.category_name || 'Uncategorized',
            unitsSold: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
            margin: 0,
            trend: 'stable'
          };
        }
        productProfits[productKey].unitsSold += quantity;
        productProfits[productKey].revenue += revenue;
        productProfits[productKey].cost += cost;
        productProfits[productKey].profit += profit;

        // Category profitability
        const categoryKey = item.category_name || 'Uncategorized';
        if (!categoryProfits[categoryKey]) {
          categoryProfits[categoryKey] = {
            name: categoryKey,
            revenue: 0,
            profit: 0,
            margin: 0
          };
        }
        categoryProfits[categoryKey].revenue += revenue;
        categoryProfits[categoryKey].profit += profit;
      });

      // Calculate margins
      Object.values(productProfits).forEach((product: any) => {
        product.margin = product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0;
        // Determine trend based on margin
        if (product.margin > 25) product.trend = 'up';
        else if (product.margin < 15) product.trend = 'down';
        else product.trend = 'stable';
      });

      Object.values(categoryProfits).forEach((category: any) => {
        category.margin = category.revenue > 0 ? (category.profit / category.revenue) * 100 : 0;
      });

      const grossProfit = totalRevenue - totalCost;
      const netProfit = grossProfit * 0.85; // Assuming 15% operating expenses
      const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

      // Calculate growth rate from previous period
      const previousPeriodStart = new Date(startDate);
      previousPeriodStart.setDate(previousPeriodStart.getDate() - daysPeriod);

      const previousSalesQuery = sqlite.prepare(`
        SELECT COALESCE(SUM(CAST(si.subtotal AS REAL)), 0) as previous_revenue
        FROM sales s
        INNER JOIN sale_items si ON s.id = si.sale_id
        WHERE s.created_at >= ? AND s.created_at < ?
      `);

      const previousRevenue = previousSalesQuery.get(
        previousPeriodStart.toISOString(),
        startDate.toISOString()
      )?.previous_revenue || 0;

      const growthRate = previousRevenue > 0 ? 
        ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

      // Convert daily data to array and fill missing days
      const trends = [];
      for (let i = daysPeriod - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        trends.push({
          date: dateStr,
          revenue: dailyData[dateStr]?.revenue || 0,
          cost: dailyData[dateStr]?.cost || 0,
          profit: dailyData[dateStr]?.profit || 0
        });
      }

      // Get top products by profit
      const topProducts = Object.values(productProfits)
        .sort((a: any, b: any) => b.profit - a.profit)
        .slice(0, 10);

      // Get low profit products
      const lowProfitProducts = Object.values(productProfits)
        .filter((product: any) => product.margin < 15)
        .sort((a: any, b: any) => a.margin - b.margin)
        .slice(0, 5)
        .map((product: any) => ({
          id: product.id,
          name: product.name,
          margin: product.margin,
          trend: product.trend,
          action: product.margin < 5 ? 'Review pricing' : 
                  product.margin < 10 ? 'Optimize cost' : 'Check supplier'
        }));

      const response = {
        overview: {
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalCost: Math.round(totalCost * 100) / 100,
          grossProfit: Math.round(grossProfit * 100) / 100,
          netProfit: Math.round(netProfit * 100) / 100,
          profitMargin: Math.round(profitMargin * 100) / 100,
          growthRate: Math.round(growthRate * 100) / 100
        },
        trends,
        productProfitability: topProducts,
        categoryProfits: Object.values(categoryProfits),
        lowProfitProducts
      };

      console.log('📈 Profit analysis response:', {
        totalRevenue: response.overview.totalRevenue,
        totalCost: response.overview.totalCost,
        grossProfit: response.overview.grossProfit,
        profitMargin: response.overview.profitMargin,
        trendsCount: response.trends.length,
        productsCount: response.productProfitability.length
      });

      res.json(response);
    } catch (error) {
      console.error("❌ Error fetching profit analysis:", error);
      res.status(500).json({ error: "Failed to fetch profit analysis" });
    }
  });

  // Sales Reports API
  app.get('/api/reports/sales', async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      console.log('📊 Sales reports endpoint accessed:', { startDate, endDate });

      if (!startDate || !endDate) {
        return res.status(400).json({ 
          error: 'Missing required parameters',
          message: 'Both startDate and endDate are required'
        });
      }

      // Use direct SQLite queries for reliable data access
      const { sqlite } = await import('../db/index.js');

      // Get sales data within date range
      const salesQuery = `
        SELECT 
          s.id,
          s.order_number,
          s.customer_id,
          s.user_id,
          s.total,
          s.tax,
          s.discount,
          s.payment_method,
          s.status,
          s.created_at,
          c.name as customer_name,
          u.name as user_name
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN users u ON s.user_id = u.id
        WHERE DATE(s.created_at) >= DATE(?) AND DATE(s.created_at) <= DATE(?)
        ORDER BY s.created_at DESC
      `;

      const sales = sqlite.prepare(salesQuery).all(startDate, endDate);
      console.log(`📈 Found ${sales.length} sales for report period`);

      // Get sale items with product details
      let saleItems = [];
      if (sales.length > 0) {
        const saleItemsQuery = `
          SELECT 
            si.sale_id,
            si.product_id,
            si.quantity,
            si.unit_price,
            si.subtotal,
            p.name as product_name,
            p.sku,
            c.name as category_name
          FROM sale_items si
          LEFT JOIN products p ON si.product_id = p.id
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE si.sale_id IN (${sales.map(() => '?').join(',')})
        `;

        saleItems = sqlite.prepare(saleItemsQuery).all(...sales.map(s => s.id));
      }

      console.log(`📦 Found ${saleItems.length} sale items`);

      // Calculate metrics
      const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.total || '0'), 0);
      const totalSales = saleItems.reduce((sum, item) => sum + parseInt(item.quantity || '0'), 0);
      const totalTransactions = sales.length;
      const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

      // Group sale items by product
      const productSales = {};
      saleItems.forEach(item => {
        const productId = item.product_id;
        if (!productSales[productId]) {
          productSales[productId] = {
            productName: item.product_name || 'Unknown Product',
            quantity: 0,
            revenue: 0
          };
        }
        productSales[productId].quantity += parseInt(item.quantity || '0');
        productSales[productId].revenue += parseFloat(item.subtotal || '0');
      });

      // Get top products
      const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Payment method breakdown
      const paymentMethods = {};
      sales.forEach(sale => {
        const method = sale.payment_method || 'unknown';
        if (!paymentMethods[method]) {
          paymentMethods[method] = { count: 0, amount: 0 };
        }
        paymentMethods[method].count++;
        paymentMethods[method].amount += parseFloat(sale.total || '0');
      });

      const paymentMethodBreakdown = Object.entries(paymentMethods).map(([method, data]) => ({
        method,
        count: data.count,
        amount: data.amount
      }));

      // Daily trends
      const dailyData = {};
      sales.forEach(sale => {
        const date = sale.created_at.split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = {
            date,
            sales: 0,
            revenue: 0,
            transactions: 0
          };
        }
        dailyData[date].revenue += parseFloat(sale.total || '0');
        dailyData[date].transactions++;
      });

      // Add sales quantities to daily data
      saleItems.forEach(item => {
        const sale = sales.find(s => s.id === item.sale_id);
        if (sale) {
          const date = sale.created_at.split('T')[0];
          if (dailyData[date]) {
            dailyData[date].sales += parseInt(item.quantity || '0');
          }
        }
      });

      const dailyTrends = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

      // Sales by category
      const categorySales = {};
      saleItems.forEach(item => {
        const category = item.category_name || 'Uncategorized';
        if (!categorySales[category]) {
          categorySales[category] = {
            category,
            sales: 0,
            revenue: 0
          };
        }
        categorySales[category].sales += parseInt(item.quantity || '0');
        categorySales[category].revenue += parseFloat(item.subtotal || '0');
      });

      const salesByCategory = Object.values(categorySales)
        .sort((a, b) => b.revenue - a.revenue);

      // Customer insights
      const customerData = {};
      sales.forEach(sale => {
        if (sale.customer_id && sale.customer_name) {
          const customerId = sale.customer_id;
          if (!customerData[customerId]) {
            customerData[customerId] = {
              customerId,
              customerName: sale.customer_name,
              totalOrders: 0,
              totalSpent: 0
            };
          }
          customerData[customerId].totalOrders++;
          customerData[customerId].totalSpent += parseFloat(sale.total || '0');
        }
      });

      const customerInsights = Object.values(customerData)
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);

      const reportData = {
        totalSales,
        totalRevenue,
        totalTransactions,
        averageOrderValue,
        topProducts,
        paymentMethodBreakdown,
        dailyTrends,
        salesByCategory,
        customerInsights
      };

      console.log('📊 Sales report generated successfully:', {
        totalRevenue,
        totalTransactions,
        topProductsCount: topProducts.length,
        dailyTrendsCount: dailyTrends.length
      });

      res.json(reportData);

    } catch (error) {
      console.error('❌ Sales report generation failed:', error);
      res.status(500).json({ 
        error: 'Failed to generate sales report',
        message: error.message 
      });
    }
  });

  // Purchase Reports endpoint
  app.get('/api/reports/purchases', isAuthenticated, async (req, res) => {
    try {
      console.log('📊 Purchase reports endpoint accessed');
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start date and end date are required' });
      }

      // Convert dates to proper format for SQL
      const start = new Date(`${startDate}T00:00:00.000Z`);
      const end = new Date(`${endDate}T23:59:59.999Z`);

      console.log(`📅 Date range: ${start.toISOString()} to ${end.toISOString()}`);



      // Use direct SQLite queries for purchase reports
      const { sqlite } = await import('../db/index.js');

      // Get purchases within date range
      const purchaseQuery = `
        SELECT 
          p.*,
          s.name as supplier_name
        FROM purchases p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE date(p.created_at) >= date(?) AND date(p.created_at) <= date(?)
        ORDER BY p.created_at DESC
      `;

      const purchases = sqlite.prepare(purchaseQuery).all(startDate, endDate);

      // Get purchase items with product details
      const purchaseItemsQuery = `
        SELECT 
          pi.*,
          p.name as product_name,
          p.sku as product_sku,
          c.name as category_name,
          pur.id as purchase_id
        FROM purchase_items pi
        LEFT JOIN products p ON pi.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN purchases pur ON pi.purchase_id = pur.id
        WHERE date(pur.created_at) >= date(?) AND date(pur.created_at) <= date(?)
      `;

      const purchaseItems = sqlite.prepare(purchaseItemsQuery).all(startDate, endDate);

      console.log(`📦 Found ${purchases.length} purchases and ${purchaseItems.length} purchase items`);

      // Calculate basic metrics
      const totalAmount = purchases.reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0);
      const totalTransactions = purchases.length;
      const averageOrderValue = totalTransactions > 0 ? totalAmount / totalTransactions : 0;
      const totalPurchases = purchaseItems.reduce((sum: number, item: any) => sum + (parseInt(item.quantity) || 0), 0);

      // Top products analysis
      const productPurchases = purchaseItems.reduce((acc: any, item: any) => {
        const productName = item.product_name || 'Unknown Product';
        if (!acc[productName]) {
          acc[productName] = { quantity: 0, amount: 0 };
        }
        acc[productName].quantity += parseInt(item.quantity) || 0;
        acc[productName].amount += parseFloat(item.net_amount) || 0;
        return acc;
      }, {});

      const topProducts = Object.entries(productPurchases)
        .map(([productName, data]: [string, any]) => ({
          productName,
          quantity: data.quantity,
          amount: data.amount
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

      // Category analysis
      const categoryPurchases = purchaseItems.reduce((acc: any, item: any) => {
        const categoryName = item.category_name || 'Uncategorized';
        if (!acc[categoryName]) {
          acc[categoryName] = { purchases: 0, amount: 0 };
        }
        acc[categoryName].purchases += parseInt(item.quantity) || 0;
        acc[categoryName].amount += parseFloat(item.net_amount) || 0;
        return acc;
      }, {});

      const purchasesByCategory = Object.entries(categoryPurchases)
        .map(([category, data]: [string, any]) => ({
          category,
          purchases: data.purchases,
          amount: data.amount
        }))
        .sort((a, b) => b.amount - a.amount);

      // Payment method breakdown
      const paymentMethods = purchases.reduce((acc: any, purchase: any) => {
        const method = purchase.payment_status || 'Unknown';
        if (!acc[method]) {
          acc[method] = { count: 0, amount: 0 };
        }
        acc[method].count += 1;
        acc[method].amount += parseFloat(purchase.total) || 0;
        return acc;
      }, {} as Record<string, { count: number; amount: number }>);

      const paymentMethodBreakdown = Object.entries(paymentMethods)
        .map(([method, data]) => ({
          method,
          count: data.count,
          amount: data.amount
        }));

      // Daily trends
      const dailyPurchases = purchases.reduce((acc: any, purchase: any) => {
        const date = new Date(purchase.created_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { purchases: 0, amount: 0, transactions: 0 };
        }
        acc[date].transactions += 1;
        acc[date].amount += parseFloat(purchase.total) || 0;
        return acc;
      }, {} as Record<string, { purchases: number; amount: number; transactions: number }>);

      const dailyTrends = Object.entries(dailyPurchases)
        .map(([date, data]) => ({
          date,
          purchases: data.purchases,
          amount: data.amount,
          transactions: data.transactions
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Supplier insights
      const supplierPurchases = purchases.reduce((acc: any, purchase: any) => {
        const supplierId = purchase.supplier_id || 0;
        const supplierName = purchase.supplier_name || 'Unknown Supplier';
        if (!acc[supplierId]) {
          acc[supplierId] = { totalOrders: 0, totalAmount: 0, supplierName };
        }
        acc[supplierId].totalOrders += 1;
        acc[supplierId].totalAmount += parseFloat(purchase.total) || 0;
        return acc;
      }, {} as Record<number, { totalOrders: number; totalAmount: number; supplierName: string }>);

      const supplierInsights = Object.entries(supplierPurchases)
        .map(([supplierId, data]) => ({
          supplierId: parseInt(supplierId),
          supplierName: data.supplierName,
          totalOrders: data.totalOrders,
          totalAmount: data.totalAmount
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 10);

      const reportData = {
        totalPurchases,
        totalAmount,
        totalTransactions,
        averageOrderValue,
        topProducts,
        paymentMethodBreakdown,
        dailyTrends,
        purchasesByCategory,
        supplierInsights
      };

      console.log('✅ Purchase report generated successfully');
      res.json(reportData);
    } catch (error) {
      console.error('❌ Error generating purchase report:', error);
      res.status(500).json({ 
        error: 'Failed to generate purchase report',
        message: error.message 
      });
    }
  });

  // Stock Reports endpoint
  app.get('/api/reports/stock', isAuthenticated, async (req, res) => {
    try {
      console.log('📦 Stock reports endpoint accessed');

      // Use direct database queries for stock reports
      const { sqlite } = await import('../db/index.js');

      // Current stock summary
      const stockSummaryQuery = `
        SELECT 
          COUNT(DISTINCT p.id) as totalProducts,
          SUM(CASE WHEN p.stock_quantity > 0 THEN 1 ELSE 0 END) as productsInStock,
          SUM(CASE WHEN p.stock_quantity <= 0 THEN 1 ELSE 0 END) as outOfStock,
          SUM(CASE WHEN p.stock_quantity <= p.alert_threshold THEN 1 ELSE 0 END) as lowStock,
          ROUND(SUM(p.stock_quantity * p.cost), 2) as totalStockValue,
          ROUND(SUM(p.stock_quantity * p.price), 2) as totalRetailValue
        FROM products p
        WHERE p.active = 1
      `;

      const stockSummary = sqlite.prepare(stockSummaryQuery).get();

      // Stock by category
      const stockByCategoryQuery = `
        SELECT 
          c.name as categoryName,
          COUNT(p.id) as productCount,
          SUM(p.stock_quantity) as totalQuantity,
          ROUND(SUM(p.stock_quantity * p.cost), 2) as categoryValue,
          SUM(CASE WHEN p.stock_quantity <= p.alert_threshold THEN 1 ELSE 0 END) as lowStockCount
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.active = 1
        GROUP BY c.id, c.name
        ORDER BY categoryValue DESC
      `;

      const stockByCategory = sqlite.prepare(stockByCategoryQuery).all();

      // Low stock items
      const lowStockQuery = `
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.stock_quantity,
          p.alert_threshold,
          p.cost,
          p.price,
          c.name as categoryName,
          ROUND((p.alert_threshold - p.stock_quantity), 2) as deficit
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.active = 1 AND p.stock_quantity <= p.alert_threshold
        ORDER BY deficit DESC
        LIMIT 20
      `;

      const lowStockItems = sqlite.prepare(lowStockQuery).all();

      // High value items
      const highValueQuery = `
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.stock_quantity,
          p.cost,
          p.price,
          c.name as categoryName,
          ROUND(p.stock_quantity * p.cost, 2) as stockValue,
          ROUND(p.stock_quantity * p.price, 2) as retailValue
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.active = 1 AND p.stock_quantity > 0
        ORDER BY stockValue DESC
        LIMIT 15
      `;

      const highValueItems = sqlite.prepare(highValueQuery).all();

      // Stock movement analysis (recent purchases and sales)
      const recentMovementsQuery = `
        SELECT 
          'purchase' as type,
          pi.product_id,
          p.name as productName,
          pi.quantity,
          pi.unit_cost as unit_price,
          pur.created_at as date,
          s.name as supplierName,
          NULL as customerName
        FROM purchase_items pi
        LEFT JOIN purchases pur ON pi.purchase_id = pur.id
        LEFT JOIN products p ON pi.product_id = p.id
        LEFT JOIN suppliers s ON pur.supplier_id = s.id
        WHERE date(pur.created_at) >= date('now', '-30 days')

        UNION ALL

        SELECT 
          'sale' as type,
          si.product_id,
          p.name as productName,
          -si.quantity as quantity,
          si.unit_price,
          sal.created_at as date,
          NULL as supplierName,
          c.name as customerName
        FROM sale_items si
        LEFT JOIN sales sal ON si.sale_id = sal.id
        LEFT JOIN products p ON si.product_id = p.id
        LEFT JOIN customers c ON sal.customer_id = c.id
        WHERE date(sal.created_at) >= date('now', '-30 days')

        ORDER BY date DESC
        LIMIT 50
      `;

      const recentMovements = sqlite.prepare(recentMovementsQuery).all();

      // Zero stock items
      const zeroStockQuery = `
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.cost,
          p.price,
          c.name as categoryName,
          p.updated_at as lastUpdated
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.active = 1 AND p.stock_quantity = 0
        ORDER BY p.updated_at DESC
        LIMIT 20
      `;

      const zeroStockItems = sqlite.prepare(zeroStockQuery).all();

      const reportData = {
        stockSummary: {
          totalProducts: stockSummary.totalProducts || 0,
          productsInStock: stockSummary.productsInStock || 0,
          outOfStock: stockSummary.outOfStock || 0,
          lowStock: stockSummary.lowStock || 0,
          totalStockValue: stockSummary.totalStockValue || 0,
          totalRetailValue: stockSummary.totalRetailValue || 0,
          profitPotential: (stockSummary.totalRetailValue || 0) - (stockSummary.totalStockValue || 0)
        },
        stockByCategory,
        lowStockItems,
        highValueItems,
        recentMovements,
        zeroStockItems
      };

      console.log('✅ Stock report generated successfully');
      res.json(reportData);

    } catch (error) {
      console.error('❌ Stock reports error:', error);
      res.status(500).json({ error: 'Failed to generate stock reports' });
    }
  });

  // Customer Reports endpoint
  app.get('/api/reports/customers', isAuthenticated, async (req, res) => {
    try {
      console.log('👥 Customer reports endpoint accessed');

      const { dateRange = '30days' } = req.query;
      console.log('📅 Date range:', dateRange);

      let daysBack = 30;
      switch (dateRange) {
        case '7days': daysBack = 7; break;
        case '30days': daysBack = 30; break;
        case '90days': daysBack = 90; break;
        case '1year': daysBack = 365; break;
      }

      // Customer summary
      const customerSummaryQuery = `
        SELECT 
          COUNT(DISTINCT c.id) as totalCustomers,
          COUNT(DISTINCT CASE WHEN s.created_at >= date('now', '-30 days') THEN c.id END) as activeCustomers,
          COUNT(DISTINCT CASE WHEN c.created_at >= date('now', '-30 days') THEN c.id END) as newCustomersThisMonth,
          ROUND(AVG(s.total), 2) as avgOrderValue,
          ROUND(SUM(s.total), 2) as totalRevenue
        FROM customers c
        LEFT JOIN sales s ON c.id = s.customer_id
        WHERE s.created_at >= date('now', '-${daysBack} days') OR c.created_at >= date('now', '-${daysBack} days')
      `;

      const customerSummary = sqlite.prepare(customerSummaryQuery).get();

      // Calculate repeat customer rate
      const repeatCustomerQuery = `
        SELECT 
          COUNT(DISTINCT customer_id) as totalWithOrders,
          COUNT(DISTINCT CASE WHEN order_count > 1 THEN customer_id END) as repeatCustomers
        FROM (
          SELECT customer_id, COUNT(*) as order_count
          FROM sales 
          WHERE created_at >= date('now', '-${daysBack} days')
          GROUP BY customer_id
        )
      `;

      const repeatStats = sqlite.prepare(repeatCustomerQuery).get();
      const repeatCustomerRate = repeatStats.totalWithOrders > 0 
        ? (repeatStats.repeatCustomers / repeatStats.totalWithOrders * 100) 
        : 0;

      // Top customers - if no customers have sales, show all customers with zero data
      const topCustomersQuery = `
        SELECT 
          c.id,
          c.name,
          c.phone,
          c.email,
          COUNT(s.id) as totalOrders,
          ROUND(COALESCE(SUM(s.total), 0), 2) as totalSpent,
          ROUND(COALESCE(AVG(s.total), 0), 2) as avgOrderValue,
          MAX(s.created_at) as lastOrderDate,
          CASE 
            WHEN MAX(s.created_at) >= date('now', '-30 days') THEN 'active'
            ELSE 'inactive'
          END as status
        FROM customers c
        LEFT JOIN sales s ON c.id = s.customer_id AND s.customer_id IS NOT NULL
        GROUP BY c.id, c.name, c.phone, c.email
        ORDER BY totalSpent DESC, c.name ASC
        LIMIT 20
      `;

      const topCustomers = sqlite.prepare(topCustomersQuery).all();

      // Customer segments
      const customerSegments = [
        {
          segment: 'VIP Customers',
          count: topCustomers.filter(c => c.totalSpent > 5000).length,
          percentage: (topCustomers.filter(c => c.totalSpent > 5000).length / Math.max(topCustomers.length, 1) * 100),
          avgSpent: topCustomers.filter(c => c.totalSpent > 5000).reduce((sum, c) => sum + c.totalSpent, 0) / Math.max(topCustomers.filter(c => c.totalSpent > 5000).length, 1),
          description: 'High-value customers with over ₹5,000 spent'
        },
        {
          segment: 'Regular Customers',
          count: topCustomers.filter(c => c.totalSpent >= 1000 && c.totalSpent <= 5000).length,
          percentage: (topCustomers.filter(c => c.totalSpent >= 1000 && c.totalSpent <= 5000).length / Math.max(topCustomers.length, 1) * 100),
          avgSpent: topCustomers.filter(c => c.totalSpent >= 1000 && c.totalSpent <= 5000).reduce((sum, c) => sum + c.totalSpent, 0) / Math.max(topCustomers.filter(c => c.totalSpent >= 1000 && c.totalSpent <= 5000).length, 1),
          description: 'Consistent customers spending ₹1,000-₹5,000'
        },
        {
          segment: 'New Customers',
          count: topCustomers.filter(c => c.totalSpent < 1000).length,
          percentage: (topCustomers.filter(c => c.totalSpent < 1000).length / Math.max(topCustomers.length, 1) * 100),
          avgSpent: topCustomers.filter(c => c.totalSpent < 1000).reduce((sum, c) => sum + c.totalSpent, 0) / Math.max(topCustomers.filter(c => c.totalSpent < 1000).length, 1),
          description: 'New customers with under ₹1,000 spent'
        },
        {
          segment: 'Repeat Buyers',
          count: topCustomers.filter(c => c.totalOrders > 1).length,
          percentage: (topCustomers.filter(c => c.totalOrders > 1).length / Math.max(topCustomers.length, 1) * 100),
          avgSpent: topCustomers.filter(c => c.totalOrders > 1).reduce((sum, c) => sum + c.totalSpent, 0) / Math.max(topCustomers.filter(c => c.totalOrders > 1).length, 1),
          description: 'Customers with multiple purchases'
        }
      ];

      // Recent transactions
      const recentTransactionsQuery = `
        SELECT 
          s.id,
          c.name as customerName,
          s.order_number as orderNumber,
          s.created_at as date,
          s.total as amount,
          s.payment_method as paymentMethod,
          s.status,
          COUNT(si.id) as itemsCount
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN sale_items si ON s.id = si.sale_id
        WHERE s.created_at >= date('now', '-${daysBack} days')
        GROUP BY s.id, c.name, s.order_number, s.created_at, s.total, s.payment_method, s.status
        ORDER BY s.created_at DESC
        LIMIT 20
      `;

      const recentTransactions = sqlite.prepare(recentTransactionsQuery).all();

      // Customer growth (monthly data)
      const customerGrowthQuery = `
        SELECT 
          strftime('%Y-%m', created_at) as month,
          COUNT(*) as newCustomers,
          0 as returningCustomers,
          0 as totalRevenue
        FROM customers
        WHERE created_at >= date('now', '-12 months')
        GROUP BY strftime('%Y-%m', created_at)
        ORDER BY month DESC
        LIMIT 6
      `;

      const customerGrowth = sqlite.prepare(customerGrowthQuery).all();

      const reportData = {
        customerSummary: {
          totalCustomers: customerSummary.totalCustomers || 0,
          activeCustomers: customerSummary.activeCustomers || 0,
          newCustomersThisMonth: customerSummary.newCustomersThisMonth || 0,
          avgOrderValue: customerSummary.avgOrderValue || 0,
          totalRevenue: customerSummary.totalRevenue || 0,
          repeatCustomerRate: repeatCustomerRate || 0
        },
        topCustomers: topCustomers || [],
        customerSegments: customerSegments,
        recentTransactions: recentTransactions || [],
        customerGrowth: customerGrowth || []
      };

      console.log('✅ Customer report generated successfully');
      res.json(reportData);
    } catch (error) {
      console.error('❌ Customer reports error:', error);
      res.status(500).json({ error: 'Failed to generate customer reports' });
    }
  });

  // Supplier reports endpoint
  app.get("/api/reports/suppliers", isAuthenticated, async (req, res) => {
    try {
      console.log('📊 Supplier reports endpoint accessed');
      const { sqlite } = await import('../db/index.js');

      const dateRange = req.query.range as string || '30days';
      console.log('📅 Date range:', dateRange);

      let daysBack = 30;
      if (dateRange === '90days') daysBack = 90;
      if (dateRange === '1year') daysBack = 365;

      // Supplier summary
      const supplierSummaryQuery = `
        SELECT 
          COUNT(DISTINCT s.id) as totalSuppliers,
          COUNT(DISTINCT CASE WHEN p.created_at >= date('now', '-30 days') THEN s.id END) as activeSuppliers,
          ROUND(COALESCE(SUM(p.total), 0), 2) as totalPurchaseValue,
          ROUND(COALESCE(AVG(p.total), 0), 2) as avgPurchaseValue,
          COUNT(p.id) as totalPurchases
        FROM suppliers s
        LEFT JOIN purchases p ON s.id = p.supplier_id
        WHERE s.id IS NOT NULL
      `;

      const supplierSummary = sqlite.prepare(supplierSummaryQuery).get();

      // Top supplier spending
      const topSupplierQuery = `
        SELECT ROUND(COALESCE(MAX(supplier_total), 0), 2) as topSupplierSpending
        FROM (
          SELECT SUM(p.total) as supplier_total
          FROM suppliers s
          LEFT JOIN purchases p ON s.id = p.supplier_id
          WHERE p.id IS NOT NULL
          GROUP BY s.id
        )
      `;

      const topSupplierResult = sqlite.prepare(topSupplierQuery).get();

      // Top suppliers by purchase volume
      const topSuppliersQuery = `
        SELECT 
          s.id,
          s.name,
          s.phone as contact,
          s.email,
          COUNT(p.id) as totalPurchases,
          ROUND(COALESCE(SUM(p.total), 0), 2) as totalSpent,
          ROUND(COALESCE(AVG(p.total), 0), 2) as avgPurchaseValue,
          MAX(p.created_at) as lastPurchaseDate,
          CASE 
            WHEN MAX(p.created_at) >= date('now', '-30 days') THEN 'active'
            ELSE 'inactive'
          END as status,
          CASE 
            WHEN COUNT(p.id) >= 10 THEN 95
            WHEN COUNT(p.id) >= 5 THEN 85
            WHEN COUNT(p.id) >= 3 THEN 75
            WHEN COUNT(p.id) >= 1 THEN 65
            ELSE 50
          END as performance
        FROM suppliers s
        LEFT JOIN purchases p ON s.id = p.supplier_id AND p.supplier_id IS NOT NULL
        GROUP BY s.id, s.name, s.phone, s.email
        ORDER BY totalSpent DESC, s.name ASC
        LIMIT 20
      `;

      const topSuppliers = sqlite.prepare(topSuppliersQuery).all();

      // Supplier categories
      const supplierCategories = [
        {
          category: 'Premium Suppliers',
          count: topSuppliers.filter(s => s.totalSpent > 10000).length,
          percentage: (topSuppliers.filter(s => s.totalSpent > 10000).length / Math.max(topSuppliers.length, 1) * 100),
          totalSpent: topSuppliers.filter(s => s.totalSpent > 10000).reduce((sum, s) => sum + s.totalSpent, 0),
          description: 'High-value suppliers with over ₹10,000 in purchases'
        },
        {
          category: 'Regular Suppliers',
          count: topSuppliers.filter(s => s.totalSpent >= 5000 && s.totalSpent <= 10000).length,
          percentage: (topSuppliers.filter(s => s.totalSpent >= 5000 && s.totalSpent <= 10000).length / Math.max(topSuppliers.length, 1) * 100),
          totalSpent: topSuppliers.filter(s => s.totalSpent >= 5000 && s.totalSpent <= 10000).reduce((sum, s) => sum + s.totalSpent, 0),
          description: 'Consistent suppliers with ₹5,000-₹10,000 in purchases'
        },
        {
          category: 'New Suppliers',
          count: topSuppliers.filter(s => s.totalSpent < 5000).length,
          percentage: (topSuppliers.filter(s => s.totalSpent < 5000).length / Math.max(topSuppliers.length, 1) * 100),
          totalSpent: topSuppliers.filter(s => s.totalSpent < 5000).reduce((sum, s) => sum + s.totalSpent, 0),
          description: 'New suppliers with under ₹5,000 in purchases'
        },
        {
          category: 'Frequent Suppliers',
          count: topSuppliers.filter(s => s.totalPurchases > 3).length,
          percentage: (topSuppliers.filter(s => s.totalPurchases > 3).length / Math.max(topSuppliers.length, 1) * 100),
          totalSpent: topSuppliers.filter(s => s.totalPurchases > 3).reduce((sum, s) => sum + s.totalSpent, 0),
          description: 'Suppliers with multiple purchase orders'
        }
      ];

      // Recent transactions
      const recentTransactionsQuery = `
        SELECT 
          p.id,
          s.name as supplierName,
          COALESCE(p.purchase_number, p.order_number, 'PO-' || p.id) as purchaseNumber,
          p.created_at as date,
          p.total as amount,
          COALESCE(p.status, 'Pending') as paymentStatus,
          COUNT(pi.id) as itemsCount
        FROM purchases p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
        WHERE p.supplier_id IS NOT NULL
        GROUP BY p.id, s.name, p.purchase_number, p.order_number, p.created_at, p.total, p.status
        ORDER BY p.created_at DESC
        LIMIT 20
      `;

      const recentTransactions = sqlite.prepare(recentTransactionsQuery).all();

      // Supplier trends (monthly data)
      const supplierTrendsQuery = `
        SELECT 
          strftime('%Y-%m', p.created_at) as month,
          COUNT(p.id) as totalPurchases,
          ROUND(SUM(p.total), 2) as totalAmount,
          COUNT(DISTINCT p.supplier_id) as supplierCount
        FROM purchases p
        WHERE p.created_at >= date('now', '-12 months') AND p.supplier_id IS NOT NULL
        GROUP BY strftime('%Y-%m', p.created_at)
        ORDER BY month DESC
        LIMIT 12
      `;

      const supplierTrends = sqlite.prepare(supplierTrendsQuery).all();

      const result = {
        supplierSummary: {
          totalSuppliers: supplierSummary.totalSuppliers || 0,
          activeSuppliers: supplierSummary.activeSuppliers || 0,
          totalPurchaseValue: supplierSummary.totalPurchaseValue || 0,
          avgPurchaseValue: supplierSummary.avgPurchaseValue || 0,
          totalPurchases: supplierSummary.totalPurchases || 0,
          topSupplierSpending: topSupplierResult.topSupplierSpending || 0
        },
        topSuppliers: topSuppliers || [],
        supplierCategories,
        recentTransactions: recentTransactions || [],
        supplierTrends: supplierTrends || []
      };

      console.log('✅ Supplier report generated successfully');
      res.json(result);
    } catch (error) {
      console.error('❌ Supplier reports error:', error);
      res.status(500).json({ error: 'Failed to generate supplier reports' });
    }
  });

  // Tax reports endpoint
  app.get("/api/reports/tax", isAuthenticated, async (req, res) => {
    try {
      console.log('📊 Tax reports endpoint accessed');
      const { sqlite } = await import('../db/index.js');

      const dateRange = req.query.range as string || '30days';
      console.log('📅 Date range:', dateRange);

      let daysBack = 30;
      if (dateRange === '90days') daysBack = 90;
      if (dateRange === '1year') daysBack = 365;

      // Tax summary from sales
      const taxSummaryQuery = `
        SELECT 
          COUNT(s.id) as totalTransactions,
          ROUND(COALESCE(SUM(s.total), 0), 2) as totalSales,
          ROUND(COALESCE(SUM(s.tax), 0), 2) as totalTaxCollected,
          ROUND(COALESCE(SUM(
            CASE WHEN p.cgst_rate IS NOT NULL AND p.cgst_rate != '' 
            THEN (si.subtotal * CAST(p.cgst_rate AS DECIMAL) / 100) 
            ELSE 0 END
          ), 0), 2) as cgstCollected,
          ROUND(COALESCE(SUM(
            CASE WHEN p.sgst_rate IS NOT NULL AND p.sgst_rate != '' 
            THEN (si.subtotal * CAST(p.sgst_rate AS DECIMAL) / 100) 
            ELSE 0 END
          ), 0), 2) as sgstCollected,
          ROUND(COALESCE(SUM(
            CASE WHEN p.igst_rate IS NOT NULL AND p.igst_rate != '' 
            THEN (si.subtotal * CAST(p.igst_rate AS DECIMAL) / 100) 
            ELSE 0 END
          ), 0), 2) as igstCollected,
          ROUND(COALESCE(SUM(
            CASE WHEN p.cess_rate IS NOT NULL AND p.cess_rate != '' 
            THEN (si.subtotal * CAST(p.cess_rate AS DECIMAL) / 100) 
            ELSE 0 END
          ), 0), 2) as cessCollected
        FROM sales s
        LEFT JOIN sale_items si ON s.id = si.sale_id
        LEFT JOIN products p ON si.product_id = p.id
        WHERE s.created_at >= date('now', '-${daysBack} days')
      `;

      const taxSummary = sqlite.prepare(taxSummaryQuery).get();

      // Purchase tax summary
      const purchaseTaxQuery = `
        SELECT 
          ROUND(COALESCE(SUM(pu.total), 0), 2) as totalPurchases,
          ROUND(COALESCE(SUM(
            CASE WHEN p.cgst_rate IS NOT NULL AND p.cgst_rate != '' 
            THEN (pi.subtotal * CAST(p.cgst_rate AS DECIMAL) / 100) 
            ELSE 0 END
          ), 0), 2) as purchaseCgst,
          ROUND(COALESCE(SUM(
            CASE WHEN p.sgst_rate IS NOT NULL AND p.sgst_rate != '' 
            THEN (pi.subtotal * CAST(p.sgst_rate AS DECIMAL) / 100) 
            ELSE 0 END
          ), 0), 2) as purchaseSgst,
          ROUND(COALESCE(SUM(
            CASE WHEN p.igst_rate IS NOT NULL AND p.igst_rate != '' 
            THEN (pi.subtotal * CAST(p.igst_rate AS DECIMAL) / 100) 
            ELSE 0 END
          ), 0), 2) as purchaseIgst
        FROM purchases pu
        LEFT JOIN purchase_items pi ON pu.id = pi.purchase_id
        LEFT JOIN products p ON pi.product_id = p.id
        WHERE pu.created_at >= date('now', '-${daysBack} days')
      `;

      const purchaseTax = sqlite.prepare(purchaseTaxQuery).get();

      // Tax breakdown by rate
      const taxBreakdownQuery = `
        SELECT 
          COALESCE(
            CAST(p.cgst_rate AS DECIMAL) + CAST(p.sgst_rate AS DECIMAL),
            CAST(p.igst_rate AS DECIMAL),
            0
          ) as taxRate,
          COUNT(DISTINCT s.id) as salesCount,
          ROUND(SUM(si.subtotal), 2) as salesAmount,
          ROUND(SUM(
            CASE WHEN p.cgst_rate IS NOT NULL AND p.cgst_rate != ''             THEN (si.subtotal * CAST(p.cgst_rate AS DECIMAL) / 100) 
            ELSE 0 END
          ), 2) as cgstAmount,
          ROUND(SUM(
            CASE WHEN p.sgst_rate IS NOT NULL AND p.sgst_rate != '' 
            THEN (si.subtotal * CAST(p.sgst_rate AS DECIMAL) / 100) 
            ELSE 0 END
          ), 2) as sgstAmount,
          ROUND(SUM(
            CASE WHEN p.igst_rate IS NOT NULL AND p.igst_rate != '' 
            THEN (si.subtotal * CAST(p.igst_rate AS DECIMAL) / 100) 
            ELSE 0 END
          ), 2) as igstAmount,
          ROUND(SUM(
            CASE WHEN p.cess_rate IS NOT NULL AND p.cess_rate != '' 
            THEN (si.subtotal * CAST(p.cess_rate AS DECIMAL) / 100) 
            ELSE 0 END
          ), 2) as cessAmount
        FROM sales s
        LEFT JOIN sale_items si ON s.id = si.sale_id
        LEFT JOIN products p ON si.product_id = p.id
        WHERE s.created_at >= date('now', '-${daysBack} days')
        GROUP BY taxRate
        ORDER BY taxRate
      `;

      const taxBreakdown = sqlite.prepare(taxBreakdownQuery).all().map(row => ({
        ...row,
        totalTaxAmount: (row.cgstAmount || 0) + (row.sgstAmount || 0) + (row.igstAmount || 0)
      }));

      // HSN Summary
      const hsnSummaryQuery = `
        SELECT 
          COALESCE(p.hsn_code, 'N/A') as hsnCode,
          p.name as description,
          SUM(si.quantity) as quantity,
          ROUND(SUM(si.subtotal), 2) as value,
          ROUND(SUM(si.subtotal), 2) as taxableValue,
          COALESCE(CAST(p.cgst_rate AS DECIMAL), 0) as cgstRate,
          COALESCE(CAST(p.sgst_rate AS DECIMAL), 0) as sgstRate,
          COALESCE(CAST(p.igst_rate AS DECIMAL), 0) as igstRate,
          ROUND(SUM(
            CASE WHEN p.cgst_rate IS NOT NULL AND p.cgst_rate != '' 
            THEN (si.subtotal * CAST(p.cgst_rate AS DECIMAL) / 100) 
            ELSE 0 END
          ), 2) as cgstAmount,
          ROUND(SUM(
            CASE WHEN p.sgst_rate IS NOT NULL AND p.sgst_rate != '' 
            THEN (si.subtotal * CAST(p.sgst_rate AS DECIMAL) / 100) 
            ELSE 0 END
          ), 2) as sgstAmount,
          ROUND(SUM(
            CASE WHEN p.igst_rate IS NOT NULL AND p.igst_rate != '' 
            THEN (si.subtotal * CAST(p.igst_rate AS DECIMAL) / 100) 
            ELSE 0 END
          ), 2) as igstAmount
        FROM sales s
        LEFT JOIN sale_items si ON s.id = si.sale_id
        LEFT JOIN products p ON si.product_id = p.id
        WHERE s.created_at >= date('now', '-${daysBack} days')
        GROUP BY p.hsn_code, p.name, p.cgst_rate, p.sgst_rate, p.igst_rate
        ORDER BY SUM(si.subtotal) DESC
        LIMIT 20
      `;

      const hsnSummary = sqlite.prepare(hsnSummaryQuery).all().map(row => ({
        ...row,
        totalTaxAmount: (row.cgstAmount || 0) + (row.sgstAmount || 0) + (row.igstAmount || 0)
      }));

      // Recent tax transactions
      const recentTransactionsQuery = `
        SELECT 
          s.id,
          'sale' as type,
          s.order_number as transactionNumber,
          s.created_at as date,
          COALESCE(c.name, 'Walk-in Customer') as customerSupplier,
          s.total as totalAmount,
          (s.total - COALESCE(s.tax, 0)) as taxableAmount,
          ROUND(COALESCE(SUM(
            CASE WHEN p.cgst_rate IS NOT NULL AND p.cgst_rate != '' 
            THEN (si.subtotal * CAST(p.cgst_rate AS DECIMAL) / 100) 
            ELSE 0 END
          ), 0), 2) as cgst,
          ROUND(COALESCE(SUM(
            CASE WHEN p.sgst_rate IS NOT NULL AND p.sgst_rate != '' 
            THEN (si.subtotal * CAST(p.sgst_rate AS DECIMAL) / 100) 
            ELSE 0 END
          ), 0), 2) as sgst,
          ROUND(COALESCE(SUM(
            CASE WHEN p.igst_rate IS NOT NULL AND p.igst_rate != '' 
            THEN (si.subtotal * CAST(p.igst_rate AS DECIMAL) / 100) 
            ELSE 0 END
          ), 0), 2) as igst,
          ROUND(COALESCE(SUM(
            CASE WHEN p.cess_rate IS NOT NULL AND p.cess_rate != '' 
            THEN (si.subtotal * CAST(p.cess_rate AS DECIMAL) / 100) 
            ELSE 0 END
          ), 0), 2) as cess,
          COALESCE(s.tax, 0) as totalTax,
          s.status
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN sale_items si ON s.id = si.sale_id
        LEFT JOIN products p ON si.product_id = p.id
        WHERE s.created_at >= date('now', '-${daysBack} days')
        GROUP BY s.id, s.order_number, s.created_at, c.name, s.total, s.tax, s.status
        ORDER BY s.created_at DESC
        LIMIT 15
      `;

      const recentTransactions = sqlite.prepare(recentTransactionsQuery).all();

      // Monthly trends
      const monthlyTrendsQuery = `
        SELECT 
          strftime('%Y-%m', s.created_at) as month,
          ROUND(SUM(COALESCE(s.tax, 0)), 2) as salesTax,
          0 as purchaseTax,
          ROUND(SUM(COALESCE(s.tax, 0)), 2) as netTax
        FROM sales s
        WHERE s.created_at >= date('now', '-12 months')
        GROUP BY strftime('%Y-%m', s.created_at)
        ORDER BY month DESC
        LIMIT 12
      `;

      const monthlyTrends = sqlite.prepare(monthlyTrendsQuery).all();

      // Compliance alerts
      const complianceAlerts = [];

      // Check for missing HSN codes
      const missingHsnQuery = `
        SELECT COUNT(*) as count
        FROM products p
        WHERE (p.hsn_code IS NULL OR p.hsn_code = '') AND p.active = 1
      `;
      const missingHsn = sqlite.prepare(missingHsnQuery).get();

      if (missingHsn.count > 0) {
        complianceAlerts.push({
          type: 'warning',
          message: `${missingHsn.count} products missing HSN codes`,
          description: 'HSN codes are mandatory for GST compliance. Please update product information.',
          actionRequired: true
        });
      }

      // Check for zero tax rates
      const zeroTaxQuery = `
        SELECT COUNT(*) as count
        FROM products p
        WHERE (p.cgst_rate IS NULL OR p.cgst_rate = '' OR p.cgst_rate = '0')
        AND (p.sgst_rate IS NULL OR p.sgst_rate = '' OR p.sgst_rate = '0')
        AND (p.igst_rate IS NULL OR p.igst_rate = '' OR p.igst_rate = '0')
        AND p.active = 1
      `;
      const zeroTax = sqlite.prepare(zeroTaxQuery).get();

      if (zeroTax.count > 0) {
        complianceAlerts.push({
          type: 'info',
          message: `${zeroTax.count} products with zero tax rates`,
          description: 'Verify if these products are exempt or if tax rates need to be configured.',
          actionRequired: false
        });
      }

      const result = {
        taxSummary: {
          totalSales: taxSummary.totalSales || 0,
          totalTaxCollected: taxSummary.totalTaxCollected || 0,
          cgstCollected: taxSummary.cgstCollected || 0,
          sgstCollected: taxSummary.sgstCollected || 0,
          igstCollected: taxSummary.igstCollected || 0,
          cessCollected: taxSummary.cessCollected || 0,
          totalPurchases: purchaseTax.totalPurchases || 0,
          totalTaxPaid: (purchaseTax.purchaseCgst || 0) + (purchaseTax.purchaseSgst || 0) + (purchaseTax.purchaseIgst || 0),
          netTaxLiability: (taxSummary.totalTaxCollected || 0) - ((purchaseTax.purchaseCgst || 0) + (purchaseTax.purchaseSgst || 0) + (purchaseTax.purchaseIgst || 0)),
          taxableTransactions: taxSummary.totalTransactions || 0,
          exemptTransactions: 0
        },
        taxBreakdown: taxBreakdown || [],
        hsnSummary: hsnSummary || [],
        recentTransactions: recentTransactions || [],
        complianceAlerts: complianceAlerts || [],
        monthlyTrends: monthlyTrends || []
      };

      console.log('✅ Tax report generated successfully');
      res.json(result);
    } catch (error) {
      console.error('❌ Tax reports error:', error);
      res.status(500).json({ error: 'Failed to generate tax reports' });
    }
  });

  // ===========================================
  // TAX MANAGEMENT API ENDPOINTS
  // ===========================================

  // Tax Categories Management
  app.get('/api/tax/categories', isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getTaxCategories();
      res.json(categories);
    } catch (error) {
      console.error('Error fetching tax categories:', error);
      res.status(500).json({ error: 'Failed to fetch tax categories' });
    }
  });

  app.post('/api/tax/categories', isAdminOrManager, async (req, res) => {
    try {
      const validatedData = schema.taxCategoryInsertSchema.parse(req.body);
      const category = await storage.createTaxCategory(validatedData);
      res.status(201).json(category);
    } catch (error) {
      console.error('Error creating tax category:', error);
      res.status(500).json({ error: 'Failed to create tax category' });
    }
  });

  app.put('/api/tax/categories/:id', isAdminOrManager, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = schema.taxCategoryInsertSchema.partial().parse(req.body);
      const category = await storage.updateTaxCategory(id, validatedData);
      if (!category) {
        return res.status(404).json({ error: 'Tax category not found' });
      }
      res.json(category);
    } catch (error) {
      console.error('Error updating tax category:', error);
      res.status(500).json({ error: 'Failed to update tax category' });
    }
  });

  app.delete('/api/tax/categories/:id', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteTaxCategory(id);
      if (!success) {
        return res.status(404).json({ error: 'Tax category not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting tax category:', error);
      res.status(500).json({ error: 'Failed to delete tax category' });
    }
  });

  // Tax Settings Management
  app.get('/api/tax/settings', isAuthenticated, async (req, res) => {
    try {
      const settings = await storage.getTaxSettings();
      res.json(settings || {});
    } catch (error) {
      console.error('Error fetching tax settings:', error);
      res.status(500).json({ error: 'Failed to fetch tax settings' });
    }
  });

  app.put('/api/tax/settings', isAdminOrManager, async (req, res) => {
    try {
      const validatedData = schema.taxSettingsInsertSchema.parse(req.body);
      const settings = await storage.updateTaxSettings(validatedData);
      res.json(settings);
    } catch (error) {
      console.error('Error updating tax settings:', error);
      res.status(500).json({ error: 'Failed to update tax settings' });
    }
  });

  // HSN Codes Management
  app.get('/api/tax/hsn-codes', isAuthenticated, async (req, res) => {
    try {
      const hsnCodes = await storage.getHsnCodes();
      res.json(hsnCodes);
    } catch (error) {
      console.error('Error fetching HSN codes:', error);
      res.status(500).json({ error: 'Failed to fetch HSN codes' });
    }
  });

  app.get('/api/tax/hsn-codes/search', isAuthenticated, async (req, res) => {
    try {
      const query = req.query.q as string || '';
      if (!query || query.length < 2) {
        return res.json([]);
      }
      const hsnCodes = await storage.searchHsnCodes(query);
      res.json(hsnCodes);
    } catch (error) {
      console.error('Error searching HSN codes:', error);
      res.status(500).json({ error: 'Failed to search HSN codes' });
    }
  });

  app.get('/api/tax/hsn-codes/:code/rates', isAuthenticated, async (req, res) => {
    try {
      const code = req.params.code;
      const rates = await storage.getTaxRateByHsnCode(code);
      if (!rates) {
        return res.status(404).json({ error: 'HSN code not found' });
      }
      res.json(rates);
    } catch (error) {
      console.error('Error fetching tax rates for HSN code:', error);
      res.status(500).json({ error: 'Failed to fetch tax rates' });
    }
  });

  app.post('/api/tax/hsn-codes', isAdminOrManager, async (req, res) => {
    try {
      const validatedData = schema.hsnCodeInsertSchema.parse(req.body);
      const hsnCode = await storage.createHsnCode(validatedData);
      res.status(201).json(hsnCode);
    } catch (error) {
      console.error('Error creating HSN code:', error);
      res.status(500).json({ error: 'Failed to create HSN code' });
    }
  });

  app.put('/api/tax/hsn-codes/:id', isAdminOrManager, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = schema.hsnCodeInsertSchema.partial().parse(req.body);
      const hsnCode = await storage.updateHsnCode(id, validatedData);
      if (!hsnCode) {
        return res.status(404).json({ error: 'HSN code not found' });
      }
      res.json(hsnCode);
    } catch (error) {
      console.error('Error updating HSN code:', error);
      res.status(500).json({ error: 'Failed to update HSN code' });
    }
  });

  app.delete('/api/tax/hsn-codes/:id', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteHsnCode(id);
      if (!success) {
        return res.status(404).json({ error: 'HSN code not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting HSN code:', error);
      res.status(500).json({ error: 'Failed to delete HSN code' });
    }
  });

  // Bulk HSN Code Import
  app.post('/api/tax/hsn-codes/bulk-import', isAdmin, async (req, res) => {
    try {
      const { hsnCodes } = req.body;
      if (!Array.isArray(hsnCodes)) {
        return res.status(400).json({ error: 'Invalid data format' });
      }

      const results = [];
      for (const hsnData of hsnCodes) {
        try {
          const validatedData = schema.hsnCodeInsertSchema.parse(hsnData);
          const hsnCode = await storage.createHsnCode(validatedData);
          results.push({ success: true, hsnCode });
        } catch (error) {
          results.push({ success: false, error: error.message, data: hsnData });
        }
      }

      res.json({ results });
    } catch (error) {
      console.error('Error bulk importing HSN codes:', error);
      res.status(500).json({ error: 'Failed to bulk import HSN codes' });
    }
  });

  // Get products list for history search
  app.get("/api/products/search", isAuthenticated, async (req, res) => {
    try {
      console.log('🔍 Product search endpoint accessed');
      const { sqlite } = await import('../db/index.js');

      const searchTerm = req.query.q as string || '';
      console.log('🔍 Search term:', searchTerm);

      const searchQuery = `
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.barcode,
          p.stock_quantity,
          p.price,
          c.name as category,
          s.name as supplier
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE 
          p.active = 1 AND (
            p.name LIKE ? OR 
            p.sku LIKE ? OR 
            p.barcode LIKE ? OR
            c.name LIKE ?
          )
        ORDER BY p.name
        LIMIT 50
      `;

      const searchPattern = `%${searchTerm}%`;
      const products = sqlite.prepare(searchQuery).all(
        searchPattern, searchPattern, searchPattern, searchPattern
      );

      console.log('✅ Product search completed, found:', products.length, 'products');
      res.json(products);
    } catch (error) {
      console.error('❌ Product search error:', error);
      res.status(500).json({ error: 'Failed to search products' });
    }
  });

  // Product history endpoint
  app.get("/api/products/history/:id", isAuthenticated, async (req, res) => {
    try {
      console.log('📊 Product history endpoint accessed');
      const { sqlite } = await import('../db/index.js');

      const productId = parseInt(req.params.id);
      const dateRange = req.query.range as string || '30days';
      console.log('📅 Product ID:', productId, 'Date range:', dateRange);

      let daysBack = 30;
      if (dateRange === '7days') daysBack = 7;
      if (dateRange === '90days') daysBack = 90;
      if (dateRange === '1year') daysBack = 365;
      if (dateRange === 'all') daysBack = 36500; // ~100 years

      // Get product information
      const productQuery = `
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.barcode,
          p.stock_quantity as currentStock,
          p.price,
          p.cost,
          c.name as category,
          s.name as supplier,
          CASE WHEN p.active = 1 THEN 'Active' ELSE 'Inactive' END as status
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.id = ?
      `;

      const product = sqlite.prepare(productQuery).get(productId);

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Stock movements from sales (outgoing)
      const salesMovementsQuery = `
        SELECT 
          si.id,
          'sale' as type,
          -si.quantity as quantity,
          s.created_at as date,
          s.order_number as reference,
          u.name as user,
          'Sale transaction' as notes,
          si.unit_price as unitPrice,
          si.subtotal as totalValue,
          0 as previousStock,
          0 as newStock
        FROM sale_items si
        LEFT JOIN sales s ON si.sale_id = s.id
        LEFT JOIN users u ON s.user_id = u.id
        WHERE si.product_id = ? 
        AND s.created_at >= date('now', '-${daysBack} days')
      `;

      const salesMovements = sqlite.prepare(salesMovementsQuery).all(productId);

      // Stock movements from purchases (incoming)
      const purchaseMovementsQuery = `
        SELECT 
          pi.id,
          'purchase' as type,
          pi.quantity as quantity,
          p.created_at as date,
          COALESCE(p.purchase_number, p.order_number, 'PO-' || p.id) as reference,
          u.name as user,
          'Purchase order' as notes,
          pi.unit_cost as unitPrice,
          pi.subtotal as totalValue,
          0 as previousStock,
          0 as newStock
        FROM purchase_items pi
        LEFT JOIN purchases p ON pi.purchase_id = p.id
        LEFT JOIN users u ON p.user_id = u.id
        WHERE pi.product_id = ? 
        AND p.created_at >= date('now', '-${daysBack} days')
      `;

      const purchaseMovements = sqlite.prepare(purchaseMovementsQuery).all(productId);

      // Inventory adjustments
      const adjustmentMovementsQuery = `
        SELECT 
          ia.id,
          'adjustment' as type,
          CASE 
            WHEN ia.adjustment_type = 'add' THEN ia.quantity
            WHEN ia.adjustment_type = 'remove' THEN -ia.quantity
            ELSE ia.quantity
          END as quantity,
          ia.created_at as date,
          'ADJ-' || ia.id as reference,
          u.name as user,
          COALESCE(ia.reason, 'Stock adjustment') as notes,
          COALESCE(ia.unit_cost, 0) as unitPrice,
          COALESCE(ia.unit_cost * ia.quantity, 0) as totalValue,
          0 as previousStock,
          0 as newStock
        FROM inventory_adjustments ia
        LEFT JOIN users u ON ia.user_id = u.id
        WHERE ia.product_id = ? 
        AND ia.created_at >= date('now', '-${daysBack} days')
      `;

      const adjustmentMovements = sqlite.prepare(adjustmentMovementsQuery).all(productId);

      // Combine all movements and calculate stock progression
      const allMovements = [
        ...salesMovements,
        ...purchaseMovements,
        ...adjustmentMovements
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate previous/new stock for sales and purchases
      let currentStock = product.currentStock;
      for (let i = allMovements.length - 1; i >= 0; i--) {
        const movement = allMovements[i];
        if (movement.type !== 'adjustment') {
          movement.newStock = currentStock;
          movement.previousStock = currentStock - movement.quantity;
          currentStock = movement.previousStock;
        }
      }

      // Sales history
      const salesHistoryQuery = `
        SELECT 
          si.id,
          s.id as saleId,
          s.order_number as orderNumber,
          COALESCE(c.name, 'Walk-in Customer') as customer,
          si.quantity,
          si.unit_price as unitPrice,
          si.subtotal,
          s.created_at as date,
          s.status
        FROM sale_items si
        LEFT JOIN sales s ON si.sale_id = s.id
        LEFT JOIN customers c ON s.customer_id = c.id
        WHERE si.product_id = ? 
        AND s.created_at >= date('now', '-${daysBack} days')
        ORDER BY s.created_at DESC
      `;

      const salesHistory = sqlite.prepare(salesHistoryQuery).all(productId);

      // Purchase history
      const purchaseHistoryQuery = `
        SELECT 
          pi.id,
          p.id as purchaseId,
          COALESCE(p.purchase_number, p.order_number, 'PO-' || p.id) as orderNumber,
          s.name as supplier,
          pi.quantity,
          pi.unit_cost as unitCost,
          pi.subtotal,
          p.created_at as date,
          p.status
        FROM purchase_items pi
        LEFT JOIN purchases p ON pi.purchase_id = p.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE pi.product_id = ? 
        AND p.created_at >= date('now', '-${daysBack} days')
        ORDER BY p.created_at DESC
      `;

      const purchaseHistory = sqlite.prepare(purchaseHistoryQuery).all(productId);

      // Price history (simulated from product updates - would need audit table in real implementation)
      const priceHistory = [];

      // Analytics calculations
      const analyticsQuery = `
        SELECT 
          COALESCE(SUM(si.quantity), 0) as totalSold,
          COALESCE(AVG(si.unit_price), 0) as averageSalePrice,
          COALESCE(MAX(s.created_at), '') as lastSaleDate
        FROM sale_items si
        LEFT JOIN sales s ON si.sale_id = s.id
        WHERE si.product_id = ? 
        AND s.created_at >= date('now', '-${daysBack} days')
      `;

      const salesAnalytics = sqlite.prepare(analyticsQuery).get(productId);

      const purchaseAnalyticsQuery = `
        SELECT 
          COALESCE(SUM(pi.quantity), 0) as totalPurchased,
          COALESCE(AVG(pi.unit_cost), 0) as averagePurchasePrice,
          COALESCE(MAX(p.created_at), '') as lastPurchaseDate
        FROM purchase_items pi
        LEFT JOIN purchases p ON pi.purchase_id = p.id
        WHERE pi.product_id = ? 
        AND p.created_at >= date('now', '-${daysBack} days')
      `;

      const purchaseAnalytics = sqlite.prepare(purchaseAnalyticsQuery).get(productId);

      const profitMargin = salesAnalytics.averageSalePrice > 0 && purchaseAnalytics.averagePurchasePrice > 0
        ? ((salesAnalytics.averageSalePrice - purchaseAnalytics.averagePurchasePrice) / salesAnalytics.averageSalePrice) * 100
        : 0;

      const turnoverRate = salesAnalytics.totalSold > 0 && product.currentStock > 0
        ? salesAnalytics.totalSold / (salesAnalytics.totalSold + product.currentStock)
        : 0;

      const analytics = {
        totalSold: salesAnalytics.totalSold || 0,
        totalPurchased: purchaseAnalytics.totalPurchased || 0,
        averageSalePrice: salesAnalytics.averageSalePrice || 0,
        averagePurchasePrice: purchaseAnalytics.averagePurchasePrice || 0,
        profitMargin: profitMargin,
        turnoverRate: turnoverRate,
        daysInStock: 30, // Simplified calculation
        lastSaleDate: salesAnalytics.lastSaleDate || null,
        lastPurchaseDate: purchaseAnalytics.lastPurchaseDate || null
      };

      const result = {
        product: {
          ...product,
          currentStock: Number(product.currentStock) || 0,
          price: Number(product.price) || 0,
          cost: Number(product.cost) || 0
        },
        stockMovements: allMovements.map(movement => ({
          ...movement,
          quantity: Number(movement.quantity) || 0,
          unitPrice: Number(movement.unitPrice) || 0,
          totalValue: Number(movement.totalValue) || 0,
          previousStock: Number(movement.previousStock) || 0,
          newStock: Number(movement.newStock) || 0
        })),
        priceHistory: priceHistory,
        salesHistory: salesHistory.map(sale => ({
          ...sale,
          quantity: Number(sale.quantity) || 0,
          unitPrice: Number(sale.unitPrice) || 0,
          subtotal: Number(sale.subtotal) || 0
        })),
        purchaseHistory: purchaseHistory.map(purchase => ({
          ...purchase,
          quantity: Number(purchase.quantity) || 0,
          unitCost: Number(purchase.unitCost) || 0,
          subtotal: Number(purchase.subtotal) || 0
        })),
        analytics: analytics
      };

      console.log('✅ Product history generated successfully');
      res.json(result);
    } catch (error) {
      console.error('❌ Product history error:', error);
      res.status(500).json({ error: 'Failed to generate product history' });
    }
  });

  // Delete purchase
  app.delete("/api/purchases/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid purchase ID" });
      }

      console.log('🗑️ Deleting purchase:', id);

      // Use direct SQLite transaction
      const { sqlite } = await import('../db/index.js');

      // Start a transaction to ensure data consistency
      const deleteTransaction = sqlite.transaction(() => {
        // First delete related purchase items
        const deleteItemsStmt = sqlite.prepare("DELETE FROM purchase_items WHERE purchase_id = ?");
        const itemsResult = deleteItemsStmt.run(id);

        // Then delete the purchase
        const deletePurchaseStmt = sqlite.prepare("DELETE FROM purchases WHERE id = ?");
        const purchaseResult = deletePurchaseStmt.run(id);

        return { itemsDeleted: itemsResult.changes, purchaseDeleted: purchaseResult.changes };
      });

      const result = deleteTransaction();

      if (result.purchaseDeleted === 0) {
        return res.status(404).json({ error: "Purchase not found" });
      }

      console.log(`✅ Deleted purchase ${id} with ${result.itemsDeleted} items`);
      res.json({ 
        success: true, 
        message: "Purchase deleted successfully",
        itemsDeleted: result.itemsDeleted
      });
    } catch (error: any) {
      console.error("❌ Error deleting purchase:", error);
      res.status(500).json({ error: `Failed to delete purchase: ${error.message}` });
    }
  });

  // Cash Register API Endpoints
  app.post('/api/cash-register/open', isAuthenticated, async (req, res) => {
    try {
      const { openingCash, notes } = req.body;
      const user = req.user;

      if (!openingCash || openingCash < 0) {
        return res.status(400).json({ error: "Invalid opening cash amount" });
      }

      // Check if there's already an open register
      const activeRegister = await storage.getActiveCashRegister();
      if (activeRegister) {
        return res.status(400).json({ 
          error: "A cash register is already open",
          registerId: activeRegister.registerId 
        });
      }

      const registerId = `REG${Date.now()}`;
      const register = await storage.createCashRegister({
        registerId,
        openingCash: parseFloat(openingCash),
        openedBy: user.name,
        notes
      });

      // Add opening transaction
      await storage.addCashRegisterTransaction({
        registerId: register.id,
        type: 'opening',
        amount: parseFloat(openingCash),
        reason: 'Register opened',
        notes,
        createdBy: user.name
      });

      res.json({
        success: true,
        register,
        message: `Register ${registerId} opened with ${openingCash}`
      });
    } catch (error: any) {
      console.error('Error opening cash register:', error);
      res.status(500).json({ error: `Failed to open register: ${error.message}` });
    }
  });

  app.get('/api/cash-register/active', async (req, res) => {
    try {
      const activeRegister = await storage.getActiveCashRegister();
      res.json(activeRegister);
    } catch (error: any) {
      console.error('Error fetching active cash register:', error);
      res.status(500).json({ error: `Failed to fetch active register: ${error.message}` });
    }
  });

  app.post('/api/cash-register/:id/transaction', isAuthenticated, async (req, res) => {
    try {
      const registerId = parseInt(req.params.id);
      const { type, amount, paymentMethod, reason, notes } = req.body;
      const user = req.user;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid transaction amount" });
      }

      // Add transaction
      const transaction = await storage.addCashRegisterTransaction({
        registerId,
        type,
        amount: parseFloat(amount),
        paymentMethod,
        reason,
        notes,
        createdBy: user.name
      });

      // Update register totals based on transaction type
      const register = await storage.getCashRegisterById(registerId);
      if (!register) {
        return res.status(404).json({ error: "Cash register not found" });
      }

      const updateData: any = {};

      if (type === 'sale') {
        if (paymentMethod === 'cash') {
          updateData.cashReceived = parseFloat(register.cashReceived) + parseFloat(amount);
          updateData.currentCash = parseFloat(register.currentCash) + parseFloat(amount);
        } else if (paymentMethod === 'upi') {
          updateData.upiReceived = parseFloat(register.upiReceived) + parseFloat(amount);
        } else if (paymentMethod === 'card') {
          updateData.cardReceived = parseFloat(register.cardReceived) + parseFloat(amount);
        } else if (paymentMethod === 'bank') {
          updateData.bankReceived = parseFloat(register.bankReceived) + parseFloat(amount);
        } else if (paymentMethod === 'cheque') {
          updateData.chequeReceived = parseFloat(register.chequeReceived) + parseFloat(amount);
        } else if (paymentMethod === 'other') {
          updateData.otherReceived = parseFloat(register.otherReceived) + parseFloat(amount);
        }
        updateData.totalSales = parseFloat(register.totalSales) + parseFloat(amount);
      } else if (type === 'withdrawal') {
        updateData.totalWithdrawals = parseFloat(register.totalWithdrawals) + parseFloat(amount);
        updateData.currentCash = parseFloat(register.currentCash) - parseFloat(amount);
      } else if (type === 'deposit') {
        updateData.currentCash = parseFloat(register.currentCash) + parseFloat(amount);
      }

      await storage.updateCashRegister(registerId, updateData);

      res.json({
        success: true,
        transaction,
        message: "Transaction recorded successfully"
      });
    } catch (error: any) {
      console.error('Error recording cash register transaction:', error);
      res.status(500).json({ error: `Failed to record transaction: ${error.message}` });
    }
  });

  app.put('/api/cash-register/:id/close', isAuthenticated, async (req, res) => {
    try {
      const registerId = parseInt(req.params.id);
      const { notes } = req.body;
      const user = req.user;

      const register = await storage.getCashRegisterById(registerId);
      if (!register) {
        return res.status(404).json({ error: "Cash register not found" });
      }

      if (register.status === 'closed') {
        return res.status(400).json({ error: "Register is already closed" });
      }

      // Close the register
      const updatedRegister = await storage.updateCashRegister(registerId, {
        status: 'closed',
        closedBy: user.name
      });

      // Add closing transaction
      await storage.addCashRegisterTransaction({
        registerId,
        type: 'closing',
        amount: parseFloat(register.currentCash),
        reason: 'Register closed',
        notes,
        createdBy: user.name
      });

      res.json({
        success: true,
        register: updatedRegister,
        message: "Register closed successfully"
      });
    } catch (error: any) {
      console.error('Error closing cash register:', error);
      res.status(500).json({ error: `Failed to close register: ${error.message}` });
    }
  });

  app.get('/api/cash-register/:id/transactions', async (req, res) => {
    try {
      const registerId = parseInt(req.params.id);
      const transactions = await storage.getCashRegisterTransactions(registerId);
      res.json(transactions);
    } catch (error: any) {
      console.error('Error fetching cash register transactions:', error);
      res.status(500).json({ error: `Failed to fetch transactions: ${error.message}` });
    }
  });

  app.get('/api/cash-register', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string || '20');
      const registers = await storage.listCashRegisters(limit);
      res.json(registers);
    } catch (error: any) {
      console.error('Error listing cash registers:', error);
      res.status(500).json({ error: `Failed to list registers: ${error.message}` });
    }
  });

  app.get('/api/cash-register/recent', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string || '10');
      const registers = await storage.listCashRegisters(limit);
      res.json(registers);
    } catch (error: any) {
      console.error('Error fetching recent cash registers:', error);
      res.status(500).json({ error: `Failed to fetch recent registers: ${error.message}` });
    }
  });

  // Inventory Adjustments API
  app.get('/api/inventory-adjustments', async (req, res) => {
    try {
      const { productId, userId, adjustmentType, limit = 20, offset = 0 } = req.query;

      const options = {
        productId: productId ? parseInt(productId as string) : undefined,
        userId: userId ? parseInt(userId as string) : undefined,
        adjustmentType: adjustmentType as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      };

      const adjustments = await storage.getInventoryAdjustments(options);
      res.json(adjustments);
    } catch (error) {
      console.error('Error fetching inventory adjustments:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/inventory-adjustments', isAuthenticated, async (req, res) => {
    try {
      const {
        productId,
        adjustmentType,
        quantity,
        reason,
        notes,
        unitCost,
        batchNumber,
        expiryDate,
        locationFrom,
        locationTo,
        referenceDocument
      } = req.body;

      // Validate required fields
      if (!productId || !adjustmentType || !quantity || !reason) {
        return res.status(400).json({
          message: 'Product ID, adjustment type, quantity, and reason are required'
        });
      }

      // Validate adjustment type
      const validTypes = ['add', 'remove', 'transfer', 'correction'];
      if (!validTypes.includes(adjustmentType)) {
        return res.status(400).json({
          message: `Invalid adjustment type. Must be one of: ${validTypes.join(', ')}`
        });
      }

      // Convert quantity based on adjustment type
      const adjustmentQuantity = adjustmentType === 'remove' ? -Math.abs(quantity) : Math.abs(quantity);

      const adjustmentData = {
        productId: parseInt(productId),
        userId: req.user?.id || 1, // Default to admin user if not authenticated
        adjustmentType,
        quantity: adjustmentQuantity,
        reason,
        notes,
        unitCost: unitCost ? parseFloat(unitCost) : undefined,
        batchNumber,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        locationFrom,
        locationTo,
        referenceDocument
      };

      const adjustment = await storage.createInventoryAdjustment(adjustmentData);
      res.status(201).json({
        ...adjustment,
        message: 'Inventory adjustment created successfully'
      });
    } catch (error) {
      console.error('Error creating inventory adjustment:', error);
      res.status(500).json({ 
        message: 'Failed to create inventory adjustment',
        error: error.message 
      });
    }
  });

  app.put('/api/inventory-adjustments/:id/approve', isAdminOrManager, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const approvedBy = req.user?.id || 1;

      const adjustment = await storage.approveInventoryAdjustment(id, approvedBy);
      res.json({
        ...adjustment,
        message: 'Inventory adjustment approved successfully'
      });
    } catch (error) {
      console.error('Error approving inventory adjustment:', error);
      if (error.message === 'Inventory adjustment not found') {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ 
        message: 'Failed to approve inventory adjustment',
        error: error.message 
      });
    }
  });

  app.delete('/api/inventory-adjustments/:id', isAdminOrManager, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: 'Invalid adjustment ID' });
      }

      const deleted = await storage.deleteInventoryAdjustment(id);

      if (!deleted) {
        return res.status(404).json({ message: 'Inventory adjustment not found' });
      }

      res.json({ 
        message: 'Inventory adjustment deleted successfully',
        deletedId: id 
      });
    } catch (error) {
      console.error('Error deleting inventory adjustment:', error);
      res.status(500).json({ 
        message: 'Failed to delete inventory adjustment',
        error: error.message 
      });
    }
  });

  // Repacking API endpoint
  app.post('/api/repacking', isAuthenticated, async (req, res) => {
    try {
      console.log('📦 Creating repack from data:', req.body);

      const {
        bulkProductId,
        repackQuantity,
        unitWeight,
        weightUnit,
        costPrice,
        sellingPrice,
        wholesalePrice,
        mrp,
        newProductName,
        newProductSku,
        newProductBarcode,
        totalRepackWeight,
        bulkUnitsNeeded
      } = req.body;

      // Validate required fields
      if (!bulkProductId || !repackQuantity || !unitWeight || !newProductName || !newProductSku) {
        return res.status(400).json({
          message: 'Missing required fields for repack creation'
        });
      }

      // Get the bulk product to validate
      const bulkProduct = await storage.getProductById(bulkProductId);
      if (!bulkProduct) {
        return res.status(404).json({
          message: 'Bulk product not found'
        });
      }

      // Check if there's enough stock - if not, add more stock for demonstration
      if (bulkProduct.stockQuantity < bulkUnitsNeeded) {
        console.log(`📦 Insufficient stock detected. Adding more stock to bulk product ${bulkProduct.id}`);

        // Add more stock to the bulk product (minimum 50 units)
        const newStockQuantity = Math.max(50, bulkUnitsNeeded + 10);
        await storage.updateProduct(bulkProduct.id, {
          stockQuantity: newStockQuantity
        });

        // Update the bulkProduct object with new stock
        bulkProduct.stockQuantity = newStockQuantity;

        console.log(`✅ Stock updated: ${bulkProduct.name} now has ${newStockQuantity} units`);
      }

      // Create the new repack product
      const repackProductData = {
        name: newProductName,
        sku: newProductSku,
        barcode: newProductBarcode || '',
        description: `Repack from ${bulkProduct.name}`,
        price: sellingPrice || costPrice || 0,
        mrp: mrp || 0,
        cost: costPrice || 0,
        wholesalePrice: wholesalePrice || 0,
        weight: unitWeight,
        weightUnit: weightUnit,
        stockQuantity: repackQuantity,
        categoryId: bulkProduct.categoryId || 1,
        active: true,
        alertThreshold: 5,

        // Mark as repack product
        itemPreparationsStatus: 'Repackage',
        bulkItemName: bulkProduct.name,
        repackageUnits: repackQuantity.toString(),
        itemPerUnit: null, // Clear this field to prevent corrupted data

        // Additional product fields with defaults
        hsnCode: bulkProduct.hsnCode || '',
        gstCode: bulkProduct.gstCode || 'GST 18%',
        cgstRate: bulkProduct.cgstRate || '0',
        sgstRate: bulkProduct.sgstRate || '0',
        igstRate: bulkProduct.igstRate || '0',
        cessRate: bulkProduct.cessRate || '0',
        taxCalculationMethod: bulkProduct.taxCalculationMethod || 'exclusive',
        supplierId: bulkProduct.supplierId || null,
        manufacturerId: bulkProduct.manufacturerId || null
      };

      // Check if repack product already exists
      const existingRepack = await storage.getProductBySku(repackProductData.sku);

      let repackProduct;
      if (existingRepack) {
        // Update existing repack stock quantity
        const newStockQuantity = existingRepack.stockQuantity + repackQuantity;
        repackProduct = await storage.updateProduct(existingRepack.id, {
          stockQuantity: newStockQuantity
        });
        console.log(`✅ Updated existing repack stock: ${existingRepack.name} (${existingRepack.stockQuantity} -> ${newStockQuantity})`);
      } else {
        // Create new repack product
        repackProduct = await storage.createProduct(repackProductData);
        console.log(`✅ Repack created successfully: ${repackProduct.name}`);
      }

      // Update bulk product stock (reduce by bulkUnitsNeeded)
      const updatedBulkStock = bulkProduct.stockQuantity - bulkUnitsNeeded;
      await storage.updateProduct(bulkProductId, {
        stockQuantity: updatedBulkStock
      });

      console.log(`📦 Bulk stock updated: ${bulkProduct.name} (${bulkProduct.stockQuantity} -> ${updatedBulkStock})`);

      res.status(201).json({
        message: 'Repack created successfully',
        repackProduct: repackProduct,
        bulkProductUpdated: {
          id: bulkProductId,
          previousStock: bulkProduct.stockQuantity,
          newStock: updatedBulkStock,
          unitsUsed: bulkUnitsNeeded
        },
        repackDetails: {
          quantity: repackQuantity,
          unitWeight: unitWeight,
          weightUnit: weightUnit,
          totalWeight: totalRepackWeight
        }
      });

    } catch (error) {
      console.error('❌ Error creating repack:', error);
      res.status(500).json({
        message: 'Failed to create repack',
        error: error.message
      });
    }
  });

  // Expense Categories Routes
  app.get('/api/expense-categories', async (req, res) => {
    try {
      const categories = await storage.getExpenseCategories();
      res.json(categories);
    } catch (error) {
      console.error('Error fetching expense categories:', error);
      res.status(500).json({ message: 'Failed to fetch expense categories' });
    }
  });

  app.post('/api/expense-categories', async (req, res) => {
    try {
      const categoryData = req.body;
      const category = await storage.createExpenseCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      console.error('Error creating expense category:', error);
      res.status(500).json({ message: 'Failed to create expense category' });
    }
  });

  app.put('/api/expense-categories/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const category = await storage.updateExpenseCategory(id, updates);
      if (!category) {
        return res.status(404).json({ message: 'Expense category not found' });
      }
      res.json(category);
    } catch (error) {
      console.error('Error updating expense category:', error);
      res.status(500).json({ message: 'Failed to update expense category' });
    }
  });

  app.delete('/api/expense-categories/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteExpenseCategory(id);
      if (!success) {
        return res.status(404).json({ message: 'Expense category not found' });
      }
      res.json({ message: 'Expense category deleted successfully' });
    } catch (error) {
      console.error('Error deleting expense category:', error);
      res.status(500).json({ message: 'Failed to delete expense category' });
    }
  });

  // Expenses Routes
  app.get('/api/expenses', async (req, res) => {
    try {
      const expenses = await storage.getExpenses();
      res.json(expenses);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      res.status(500).json({ message: 'Failed to fetch expenses' });
    }
  });

  app.get('/api/expenses/stats', async (req, res) => {
    try {
      const stats = await storage.getExpenseStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching expense stats:', error);
      res.status(500).json({ message: 'Failed to fetch expense stats' });
    }
  });

  app.get('/api/expenses/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const expense = await storage.getExpenseById(id);
      if (!expense) {
        return res.status(404).json({ message: 'Expense not found' });
      }
      res.json(expense);
    } catch (error) {
      console.error('Error fetching expense:', error);
      res.status(500).json({ message: 'Failed to fetch expense' });
    }
  });

  app.post('/api/expenses', async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const expenseData = {
        ...req.body,
        userId: user.id,
        expenseDate: req.body.expenseDate || new Date().toISOString()
      };

      const expense = await storage.createExpense(expenseData);
      res.status(201).json(expense);
    } catch (error) {
      console.error('Error creating expense:', error);
      res.status(500).json({ message: 'Failed to create expense' });
    }
  });

  app.put('/api/expenses/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const expense = await storage.updateExpense(id, updates);
      if (!expense) {
        return res.status(404).json({ message: 'Expense not found' });
      }
      res.json(expense);
    } catch (error) {
      console.error('Error updating expense:', error);
      res.status(500).json({ message: 'Failed to update expense' });
    }
  });

  app.delete('/api/expenses/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteExpense(id);
      if (!success) {
        return res.status(404).json({ message: 'Expense not found' });
      }
      res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
      console.error('Error deleting expense:', error);
      res.status(500).json({ message: 'Failed to delete expense' });
    }
  });

  // Manufacturing API Routes

  // Manufacturing Statistics
  app.get('/api/manufacturing/stats', isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getManufacturingStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching manufacturing stats:', error);
      res.status(500).json({ message: 'Failed to fetch manufacturing stats' });
    }
  });

  // Manufacturing Orders Routes
  app.get('/api/manufacturing/orders', isAuthenticated, async (req, res) => {
    try {
      const orders = await storage.getManufacturingOrders();
      res.json(orders);
    } catch (error) {
      console.error('Error fetching manufacturing orders:', error);
      res.status(500).json({ message: 'Failed to fetch manufacturing orders' });
    }
  });

  app.post('/api/manufacturing/orders', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const orderData = {
        ...req.body,
        manufacturingDate: req.body.manufacturingDate || new Date().toISOString(),
        expiryDate: req.body.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        assignedUserId: req.body.assignedUserId || user.id
      };

      const order = await storage.createManufacturingOrder(orderData);
      res.status(201).json(order);
    } catch (error) {
      console.error('Error creating manufacturing order:', error);
      res.status(500).json({ message: 'Failed to create manufacturing order' });
    }
  });

  app.get('/api/manufacturing/orders/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.getManufacturingOrderById(id);
      if (!order) {
        return res.status(404).json({ message: 'Manufacturing order not found' });
      }
      res.json(order);
    } catch (error) {
      console.error('Error fetching manufacturing order:', error);
      res.status(500).json({ message: 'Failed to fetch manufacturing order' });
    }
  });

  app.put('/api/manufacturing/orders/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const order = await storage.updateManufacturingOrder(id, updates);
      if (!order) {
        return res.status(404).json({ message: 'Manufacturing order not found' });
      }
      res.json(order);
    } catch (error) {
      console.error('Error updating manufacturing order:', error);
      res.status(500).json({ message: 'Failed to update manufacturing order' });
    }
  });

  app.patch('/api/manufacturing/orders/:id/status', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const order = await storage.updateManufacturingOrderStatus(id, status);
      if (!order) {
        return res.status(404).json({ message: 'Manufacturing order not found' });
      }
      res.json(order);
    } catch (error) {
      console.error('Error updating manufacturing order status:', error);
      res.status(500).json({ message: 'Failed to update manufacturing order status' });
    }
  });

  app.delete('/api/manufacturing/orders/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteManufacturingOrder(id);
      if (!success) {
        return res.status(404).json({ message: 'Manufacturing order not found' });
      }
      res.json({ message: 'Manufacturing order deleted successfully' });
    } catch (error) {
      console.error('Error deleting manufacturing order:', error);
      res.status(500).json({ message: 'Failed to delete manufacturing order' });
    }
  });

  // Manufacturing Batches Routes
  app.get('/api/manufacturing/batches', isAuthenticated, async (req, res) => {
    try {
      const batches = await storage.getManufacturingBatches();
      res.json(batches);
    } catch (error) {
      console.error('Error fetching manufacturing batches:', error);
      res.status(500).json({ message: 'Failed to fetch manufacturing batches' });
    }
  });

  app.post('/api/manufacturing/batches', isAuthenticated, async (req, res) => {
    try {
      const batchData = {
        ...req.body,
        manufacturingDate: req.body.manufacturingDate || new Date().toISOString(),
        expiryDate: req.body.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      };

      const batch = await storage.createManufacturingBatch(batchData);
      res.status(201).json(batch);
    } catch (error) {
      console.error('Error creating manufacturing batch:', error);
      res.status(500).json({ message: 'Failed to create manufacturing batch' });
    }
  });

  app.get('/api/manufacturing/batches/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const batch = await storage.getManufacturingBatchById(id);
      if (!batch) {
        return res.status(404).json({ message: 'Manufacturing batch not found' });
      }
      res.json(batch);
    } catch (error) {
      console.error('Error fetching manufacturing batch:', error);
      res.status(500).json({ message: 'Failed to fetch manufacturing batch' });
    }
  });

  // Quality Control Routes
  app.get('/api/manufacturing/quality-checks', isAuthenticated, async (req, res) => {
    try {
      const checks = await storage.getQualityControlChecks();
      res.json(checks);
    } catch (error) {
      console.error('Error fetching quality checks:', error);
      res.status(500).json({ message: 'Failed to fetch quality checks' });
    }
  });

  app.post('/api/manufacturing/quality-checks', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const checkData = {
        ...req.body,
        inspectorUserId: user.id,
        checkDate: req.body.checkDate || new Date().toISOString()
      };

      const check = await storage.createQualityControlCheck(checkData);
      res.status(201).json(check);
    } catch (error) {
      console.error('Error creating quality check:', error);
      res.status(500).json({ message: 'Failed to create quality check' });
    }
  });

  // Raw Materials Routes
  app.get('/api/manufacturing/raw-materials', isAuthenticated, async (req, res) => {
    try {
      const materials = await storage.getRawMaterials();
      res.json(materials);
    } catch (error) {
      console.error('Error fetching raw materials:', error);
      res.status(500).json({ message: 'Failed to fetch raw materials' });
    }
  });

  app.post('/api/manufacturing/raw-materials', isAuthenticated, async (req, res) => {
    try {
      const material = await storage.createRawMaterial(req.body);
      res.status(201).json(material);
    } catch (error: any) {
      console.error('Error creating raw material:', error);
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' && error.message.includes('raw_materials.name')) {
        res.status(400).json({ 
          message: `Material name "${req.body.name}" already exists. Please choose a different name.`,
          error: 'DUPLICATE_NAME'
        });
      } else {
        res.status(500).json({ message: 'Failed to create raw material' });
      }
    }
  });

  app.put('/api/manufacturing/raw-materials/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const material = await storage.updateRawMaterial(id, updates);
      if (!material) {
        return res.status(404).json({ message: 'Raw material not found' });
      }
      res.json(material);
    } catch (error) {
      console.error('Error updating raw material:', error);
      res.status(500).json({ message: 'Failed to update raw material' });
    }
  });

  app.delete('/api/manufacturing/raw-materials/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteRawMaterial(id);
      if (!success) {
        return res.status(404).json({ message: 'Raw material not found' });
      }
      res.json({ message: 'Raw material deleted successfully' });
    } catch (error) {
      console.error('Error deleting raw material:', error);
      res.status(500).json({ message: 'Failed to delete raw material' });
    }
  });

  // Manufacturing Recipes Routes
  app.get('/api/manufacturing/recipes', isAuthenticated, async (req, res) => {
    try {
      const recipes = await storage.getManufacturingRecipes();
      res.json(recipes);
    } catch (error) {
      console.error('Error fetching manufacturing recipes:', error);
      res.status(500).json({ message: 'Failed to fetch manufacturing recipes' });
    }
  });

  app.post('/api/manufacturing/recipes', isAuthenticated, async (req, res) => {
    try {
      const recipe = await storage.createManufacturingRecipe(req.body);
      res.status(201).json(recipe);
    } catch (error) {
      console.error('Error creating manufacturing recipe:', error);
      res.status(500).json({ message: 'Failed to create manufacturing recipe' });
    }
  });

  app.get('/api/manufacturing/recipes/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const recipe = await storage.getManufacturingRecipeById(id);
      if (!recipe) {
        return res.status(404).json({ message: 'Manufacturing recipe not found' });
      }
      res.json(recipe);
    } catch (error) {
      console.error('Error fetching manufacturing recipe:', error);
      res.status(500).json({ message: 'Failed to fetch manufacturing recipe' });
    }
  });

  app.put('/api/manufacturing/recipes/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const recipe = await storage.updateManufacturingRecipe(id, updates);
      if (!recipe) {
        return res.status(404).json({ message: 'Manufacturing recipe not found' });
      }
      res.json(recipe);
    } catch (error) {
      console.error('Error updating manufacturing recipe:', error);
      res.status(500).json({ message: 'Failed to update manufacturing recipe' });
    }
  });

  // Recipe Ingredients Routes
  app.get('/api/manufacturing/recipes/:id/ingredients', isAuthenticated, async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      const ingredients = await storage.getRecipeIngredients(recipeId);
      res.json(ingredients);
    } catch (error) {
      console.error('Error fetching recipe ingredients:', error);
      res.status(500).json({ message: 'Failed to fetch recipe ingredients' });
    }
  });

  app.post('/api/manufacturing/recipes/:id/ingredients', isAuthenticated, async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      const ingredientData = {
        ...req.body,
        recipeId
      };
      const ingredient = await storage.createRecipeIngredient(ingredientData);
      res.status(201).json(ingredient);
    } catch (error) {
      console.error('Error creating recipe ingredient:', error);
      res.status(500).json({ message: 'Failed to create recipe ingredient' });
    }
  });

  app.get('/api/expenses/by-date-range', async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Start date and end date are required' });
      }

      const expenses = await storage.getExpensesByDateRange(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(expenses);
    } catch (error) {
      console.error('Error fetching expenses by date range:', error);
      res.status(500).json({ message: 'Failed to fetch expenses by date range' });
    }
  });

  app.get('/api/expenses/by-category/:categoryId', async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      const expenses = await storage.getExpensesByCategory(categoryId);
      res.json(expenses);
    } catch (error) {
      console.error('Error fetching expenses by category:', error);
      res.status(500).json({ message: 'Failed to fetch expenses by category' });
    }
  });

  app.get('/api/expenses/by-status/:status', async (req, res) => {
    try {
      const status = req.params.status;
      const expenses = await storage.getExpensesByStatus(status);
      res.json(expenses);
    } catch (error) {
      console.error('Error fetching expenses by status:', error);
      res.status(500).json({ message: 'Failed to fetch expenses by status' });
    }
  });

  // Offers Management API
  app.get('/api/offers', async (req, res) => {
    try {
      const { active, offerType, limit } = req.query;
      const filters = {
        active: active !== undefined ? active === 'true' : undefined,
        offerType: offerType as string,
        limit: limit ? parseInt(limit as string) : undefined
      };

      const offers = await storage.listOffers(filters);
      res.json(offers);
    } catch (error) {
      console.error('Error fetching offers:', error);
      res.status(500).json({ message: 'Failed to fetch offers' });
    }
  });

  app.get('/api/offers/active', async (req, res) => {
    try {
      const offers = await storage.getActiveOffers();
      res.json(offers);
    } catch (error) {
      console.error('Error fetching active offers:', error);
      res.status(500).json({ message: 'Failed to fetch active offers' });
    }
  });

  app.get('/api/offers/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const offer = await storage.getOfferById(id);

      if (!offer) {
        return res.status(404).json({ message: 'Offer not found' });
      }

      res.json(offer);
    } catch (error) {
      console.error('Error fetching offer:', error);
      res.status(500).json({ message: 'Failed to fetch offer' });
    }
  });

  app.post('/api/offers', isAuthenticated, async (req, res) => {
    try {
      const offerData = {
        ...req.body,
        createdBy: req.user.id
      };

      const validatedData = schema.offerInsertSchema.parse(offerData);
      const offer = await storage.createOffer(validatedData);

      res.status(201).json(offer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Validation failed',
          errors: error.errors 
        });
      }
      console.error('Error creating offer:', error);
      res.status(500).json({ message: 'Failed to create offer' });
    }
  });

  app.put('/api/offers/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const offerData = schema.offerInsertSchema.partial().parse(req.body);

      const offer = await storage.updateOffer(id, offerData);

      if (!offer) {
        return res.status(404).json({ message: 'Offer not found' });
      }

      res.json(offer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Validation failed',
          errors: error.errors 
        });
      }
      console.error('Error updating offer:', error);
      res.status(500).json({ message: 'Failed to update offer' });
    }
  });

  app.delete('/api/offers/:id', isAdminOrManager, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteOffer(id);

      if (!deleted) {
        return res.status(404).json({ message: 'Offer not found' });
      }

      res.json({ message: 'Offer deleted successfully' });
    } catch (error) {
      console.error('Error deleting offer:', error);
      res.status(500).json({ message: 'Failed to delete offer' });
    }
  });

  app.get('/api/offers/:id/stats', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const stats = await storage.getOfferUsageStats(id);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching offer stats:', error);
      res.status(500).json({ message: 'Failed to fetch offer statistics' });
    }
  });

  app.get('/api/offers/:id/usage', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { limit } = req.query;
      const usage = await storage.getOfferUsageHistory(id, limit ? parseInt(limit as string) : 20);
      res.json(usage);
    } catch (error) {
      console.error('Error fetching offer usage:', error);
      res.status(500).json({ message: 'Failed to fetch offer usage history' });
    }
  });

  app.post('/api/offers/calculate', async (req, res) => {
    try {
      const { offerId, cartItems, cartTotal, customerId } = req.body;

      const offer = await storage.getOfferById(offerId);
      if (!offer) {
        return res.status(404).json({ message: 'Offer not found' });
      }

      const calculation = await storage.calculateOfferDiscount(offer, cartItems, cartTotal, customerId);
      res.json(calculation);
    } catch (error) {
      console.error('Error calculating offer discount:', error);
      res.status(500).json({ message: 'Failed to calculate offer discount' });
    }
  });

  // Customer Loyalty API
  app.get('/api/loyalty/customer/:customerId', async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      let loyalty = await storage.getCustomerLoyalty(customerId);

      if (!loyalty) {
        loyalty = await storage.createCustomerLoyalty(customerId);
      }

      res.json(loyalty);
    } catch (error) {
      console.error('Error fetching customer loyalty:', error);
      res.status(500).json({ message: 'Failed to fetch customer loyalty' });
    }
  });

  app.post('/api/loyalty/customer/:customerId/redeem', isAuthenticated, async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const { points } = req.body;

      if (!points || points <= 0) {
        return res.status(400).json({ message: 'Valid points amount required' });
      }

      const loyalty = await storage.redeemLoyaltyPoints(customerId, points);
      res.json(loyalty);
    } catch (error) {
      console.error('Error redeeming loyalty points:', error);
      res.status(500).json({ message: error.message || 'Failed to redeem loyalty points' });
    }
  });

  // POS Enhanced loyalty redemption endpoint
  app.post('/api/loyalty/redeem-points', async (req, res) => {
    try {
      const { customerId, points } = req.body;

      console.log('Processing loyalty redemption:', { customerId, points });

      if (!customerId || !points || points <= 0) {
        return res.status(400).json({ message: 'Customer ID and valid points amount required' });
      }

      const loyalty = await storage.redeemLoyaltyPoints(customerId, points);

      console.log('Loyalty points redeemed successfully:', loyalty);
      res.json({
        success: true,
        message: 'Points redeemed successfully',
        loyalty,
        pointsRedeemed: points
      });
    } catch (error) {
      console.error('Error redeeming loyalty points:', error);
      res.status(500).json({ 
        success: false,
        message: error.message || 'Failed to redeem loyalty points' 
      });
    }
  });

  // Add loyalty points endpoint
  app.post('/api/loyalty/add-points', async (req, res) => {
    try {
      const { customerId, points, reason } = req.body;

      console.log('Adding loyalty points:', { customerId, points, reason });

      if (!customerId || !points || points <= 0) {
        return res.status(400).json({ message: 'Customer ID and valid points amount required' });
      }

      const loyalty = await storage.addLoyaltyPoints(customerId, points, reason || 'Points added');

      console.log('Loyalty points added successfully:', loyalty);
      res.json({
        success: true,
        message: 'Points added successfully',
        loyalty,
        pointsAdded: points
      });
    } catch (error) {
      console.error('Error adding loyalty points:', error);
      res.status(500).json({ 
        success: false,
        message: error.message || 'Failed to add loyalty points' 
      });
    }
  });

  // Update loyalty account endpoint
  app.put('/api/loyalty/customer/:customerId/update', async (req, res) => {
    try {
      const { customerId } = req.params;
      const { totalPoints, availablePoints, notes } = req.body;

      console.log('Updating loyalty account:', { customerId, totalPoints, availablePoints, notes });

      if (!customerId) {
        return res.status(400).json({ error: 'Customer ID is required' });
      }

      const result = await storage.updateLoyaltyAccount(parseInt(customerId), {
        totalPoints: parseInt(totalPoints),
        availablePoints: parseInt(availablePoints),
        notes
      });
      res.json({
        success: true,
        message: 'Loyalty account updated successfully',
        loyalty: result
      });
    } catch (error) {
      console.error('Error updating loyalty account:', error);
      res.status(500).json({ error: 'Failed to update loyalty account' });
    }
  });

  // Delete loyalty account endpoint
  app.delete('/api/loyalty/customer/:customerId', async (req, res) => {
    try {
      const { customerId } = req.params;

      console.log('Deleting loyalty account for customer:', customerId);

      if (!customerId) {
        return res.status(400).json({ error: 'Customer ID is required' });
      }

      await storage.deleteLoyaltyAccount(parseInt(customerId));
      res.json({
        success: true,
        message: 'Loyalty account deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting loyalty account:', error);
      res.status(500).json({ error: 'Failed to delete loyalty account' });
    }
  });

  // Bulk update loyalty points endpoint
  app.post('/api/loyalty/bulk-update', async (req, res) => {
    try {
      const { operation, points, reason, customerIds } = req.body;

      console.log('Bulk updating loyalty points:', { operation, points, reason, customerIds });

      if (!operation || !points || !reason || !customerIds || !Array.isArray(customerIds)) {
        return res.status(400).json({ error: 'Operation, points, reason, and customer IDs are required' });
      }

      const result = await storage.bulkUpdateLoyaltyPoints(operation, parseInt(points), reason, customerIds);
      res.json({
        success: true,
        message: `Bulk ${operation} operation completed successfully`,
        updatedCount: result.updatedCount
      });
    } catch (error) {
      console.error('Error in bulk loyalty update:', error);
      res.status(500).json({ error: 'Failed to perform bulk update' });
    }
  });

  // Bank Accounts API
  app.get('/api/bank-accounts', isAuthenticated, async (req, res) => {
    try {
      console.log('🏦 Fetching bank accounts...');
      const accounts = await storage.getAllBankAccounts();
      res.json(accounts);
    } catch (error) {
      console.error('❌ Error fetching bank accounts:', error);
      res.status(500).json({ message: 'Failed to fetch bank accounts' });
    }
  });

  // Bank Account Summary and Analytics (MUST come before :id route)
  app.get('/api/bank-accounts/summary', isAuthenticated, async (req, res) => {
    try {
      console.log('📊 Generating bank accounts summary...');
      const summary = await storage.getBankAccountSummary();
      res.json(summary);
    } catch (error) {
      console.error('❌ Error generating bank account summary:', error);
      res.status(500).json({ message: 'Failed to generate bank account summary' });
    }
  });

  app.get('/api/bank-accounts/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid account ID' });
      }

      console.log(`🏦 Fetching bank account ${id}...`);
      const account = await storage.getBankAccountById(id);

      if (!account) {
        return res.status(404).json({ message: 'Bank account not found' });
      }

      res.json(account);
    } catch (error) {
      console.error('❌ Error fetching bank account:', error);
      res.status(500).json({ message: 'Failed to fetch bank account' });
    }
  });

  app.post('/api/bank-accounts', isAuthenticated, async (req, res) => {
    try {
      console.log('🏦 Creating new bank account:', req.body);

      // Validate required fields
      const { accountName, accountNumber, bankName, accountType } = req.body;
      if (!accountName || !accountNumber || !bankName || !accountType) {
        return res.status(400).json({ 
          message: 'Account name, account number, bank name, and account type are required' 
        });
      }

      const accountData = {
        ...req.body,
        createdBy: req.user?.id || null
      };

      const account = await storage.createBankAccount(accountData);
      console.log('✅ Bank account created successfully:', account.id);
      res.status(201).json(account);
    } catch (error) {
      console.error('❌ Error creating bank account:', error);
      res.status(500).json({ 
        message: 'Failed to create bank account',
        error: error.message 
      });
    }
  });

  app.put('/api/bank-accounts/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid account ID' });
      }

      console.log(`🏦 Updating bank account ${id}:`, req.body);
      const account = await storage.updateBankAccount(id, req.body);

      if (!account) {
        return res.status(404).json({ message: 'Bank account not found' });
      }

      console.log('✅ Bank account updated successfully');
      res.json(account);
    } catch (error) {
      console.error('❌ Error updating bank account:', error);
      res.status(500).json({ 
        message: 'Failed to update bank account',
        error: error.message 
      });
    }
  });

  // Set default bank account
  app.put('/api/bank-accounts/:id/set-default', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid account ID' });
      }

      console.log(`🏦 Setting bank account ${id} as default...`);

      // Check if account exists
      const account = await storage.getBankAccountById(id);
      if (!account) {
        return res.status(404).json({ message: 'Bank account not found' });
      }

      // Set this account as default
      const success = await storage.setDefaultBankAccount(id);

      if (!success) {
        return res.status(500).json({ message: 'Failed to set default account' });
      }

      console.log('✅ Default bank account set successfully');
      res.json({ 
        success: true, 
        message: 'Default account set successfully',
        accountId: id
      });
    } catch (error) {
      console.error('❌ Error setting default bank account:', error);
      res.status(500).json({ 
        message: 'Failed to set default account',
        error: error.message 
      });
    }
  });

  app.delete('/api/bank-accounts/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid account ID' });
      }

      console.log(`🏦 Deleting bank account ${id}...`);
      const success = await storage.deleteBankAccount(id);

      console.log('✅ Bank account deleted successfully');
      res.json({ success: true, message: 'Bank account deleted successfully' });
    } catch (error) {
      console.error('❌ Error deleting bank account:', error);

      // Handle specific error cases
      if (error.message === 'Bank account not found') {
        return res.status(404).json({ message: error.message });
      }

      if (error.message.includes('Cannot delete account with') && error.message.includes('existing transactions')) {
        return res.status(400).json({ message: error.message });
      }

      res.status(500).json({ 
        message: error.message || 'Failed to delete bank account'
      });
    }
  });

  // Bank Transactions API
  app.get('/api/bank-transactions', isAuthenticated, async (req, res) => {
    try {
      const { accountId, limit } = req.query;
      console.log('💳 Fetching bank transactions...');

      let transactions;
      if (accountId) {
        transactions = await storage.getBankTransactionsByAccountId(
          parseInt(accountId as string), 
          limit ? parseInt(limit as string) : undefined
        );
      } else {
        transactions = await storage.getAllBankTransactions();
      }

      res.json(transactions);
    } catch (error) {
      console.error('❌ Error fetching bank transactions:', error);
      res.status(500).json({ message: 'Failed to fetch bank transactions' });
    }
  });

  app.post('/api/bank-transactions', isAuthenticated, async (req, res) => {
    try {
      console.log('💳 Creating new bank transaction:', req.body);

      // Validate required fields
      const { accountId, transactionId, transactionType, transactionMode, amount, description, transactionDate } = req.body;
      if (!accountId || !transactionId || !transactionType || !transactionMode || !amount || !description || !transactionDate) {
        return res.status(400).json({ 
          message: 'Account ID, transaction ID, type, mode, amount, description, and date are required' 
        });
      }

      // Get current account balance to calculate balance after transaction
      const account = await storage.getBankAccountById(accountId);
      if (!account) {
        return res.status(400).json({ message: 'Invalid account ID' });
      }

      const currentBalance = account.currentBalance || 0;
      const transactionAmount = parseFloat(amount);
      let balanceAfter;

      if (transactionType === 'credit') {
        balanceAfter = currentBalance + transactionAmount;
      } else if (transactionType === 'debit') {
        balanceAfter = currentBalance - transactionAmount;
      } else {
        return res.status(400).json({ message: 'Transaction type must be credit or debit' });
      }

      const transactionData = {
        ...req.body,
        amount: transactionAmount,
        balanceAfter,
        processedBy: req.user?.id || null
      };

      const transaction = await storage.createBankTransaction(transactionData);
      console.log('✅ Bank transaction created successfully:', transaction.id);
      res.status(201).json(transaction);
    } catch (error) {
      console.error('❌ Error creating bank transaction:', error);
      res.status(500).json({ 
        message: 'Failed to create bank transaction',
        error: error.message 
      });
    }
  });



  // Bank Account Categories
  app.get('/api/bank-account-categories', isAuthenticated, async (req, res) => {
    try {
      console.log('🏷️ Fetching bank account categories...');
      const categories = await storage.getBankAccountCategories();
      res.json(categories);
    } catch (error) {
      console.error('❌ Error fetching bank account categories:', error);
      res.status(500).json({ message: 'Failed to fetch bank account categories' });
    }
  });

  // Payroll Management API Routes

  // Employee Management Routes
  app.get('/api/employees', isAuthenticated, async (req, res) => {
    try {
      const employees = await storage.getAllEmployees();
      res.json(employees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      res.status(500).json({ message: 'Failed to fetch employees' });
    }
  });

  app.post('/api/employees', isAuthenticated, async (req, res) => {
    try {
      const validatedData = schema.insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(validatedData);
      res.status(201).json(employee);
    } catch (error) {
      console.error('Error creating employee:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid employee data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create employee' });
      }
    }
  });

  app.put('/api/employees/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = schema.insertEmployeeSchema.partial().parse(req.body);
      const employee = await storage.updateEmployee(id, validatedData);

      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      res.json(employee);
    } catch (error) {
      console.error('Error updating employee:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid employee data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to update employee' });
      }
    }
  });

  // Salary Structure Routes
  app.post('/api/salary-structures', isAuthenticated, async (req, res) => {
    try {
      const validatedData = schema.insertSalaryStructureSchema.parse(req.body);
      const salaryStructure = await storage.createSalaryStructure(validatedData);
      res.status(201).json(salaryStructure);
    } catch (error) {
      console.error('Error creating salary structure:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid salary structure data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create salary structure' });
      }
    }
  });

  app.get('/api/salary-structures/employee/:employeeId', isAuthenticated, async (req, res) => {
    try {
      const employeeId = parseInt(req.params.employeeId);
      const salaryStructure = await storage.getSalaryStructureByEmployeeId(employeeId);

      if (!salaryStructure) {
        return res.status(404).json({ message: 'Salary structure not found' });
      }

      res.json(salaryStructure);
    } catch (error) {
      console.error('Error fetching salary structure:', error);
      res.status(500).json({ message: 'Failed to fetch salary structure' });
    }
  });

  // Attendance Management Routes
  app.post('/api/attendance', isAuthenticated, async (req, res) => {
    try {
      const validatedData = schema.insertAttendanceSchema.parse(req.body);
      const attendance = await storage.markAttendance(validatedData);
      res.status(201).json(attendance);
    } catch (error) {
      console.error('Error marking attendance:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid attendance data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to mark attendance' });
      }
    }
  });

  app.get('/api/attendance/employee/:employeeId/month/:month', isAuthenticated, async (req, res) => {
    try {
      const employeeId = parseInt(req.params.employeeId);
      const month = req.params.month; // YYYY-MM format
      const attendance = await storage.getAttendanceByEmployeeAndMonth(employeeId, month);
      res.json(attendance);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      res.status(500).json({ message: 'Failed to fetch attendance records' });
    }
  });

  // Leave Management Routes
  app.post('/api/leave-applications', isAuthenticated, async (req, res) => {
    try {
      const validatedData = schema.insertLeaveApplicationSchema.parse(req.body);
      const leaveApplication = await storage.applyLeave(validatedData);
      res.status(201).json(leaveApplication);
    } catch (error) {
      console.error('Error applying leave:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid leave application data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to apply leave' });
      }
    }
  });

  app.get('/api/leave-applications/pending', isAuthenticated, async (req, res) => {
    try {
      const pendingLeaves = await storage.getPendingLeaveApplications();
      res.json(pendingLeaves);
    } catch (error) {
      console.error('Error fetching pending leave applications:', error);
      res.status(500).json({ message: 'Failed to fetch pending leave applications' });
    }
  });

  // Payroll Processing Routes
  app.post('/api/payroll', isAuthenticated, async (req, res) => {
    try {
      const validatedData = schema.insertPayrollRecordSchema.parse(req.body);
      const payrollRecord = await storage.generatePayroll(validatedData);
      res.status(201).json(payrollRecord);
    } catch (error) {
      console.error('Error generating payroll:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid payroll data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to generate payroll' });
      }
    }
  });

  app.get('/api/payroll/month/:month', isAuthenticated, async (req, res) => {
    try {
      const month = req.params.month; // YYYY-MM format
      const payrollRecords = await storage.getPayrollByMonth(month);
      res.json(payrollRecords);
    } catch (error) {
      console.error('Error fetching payroll records:', error);
      res.status(500).json({ message: 'Failed to fetch payroll records' });
    }
  });

  // Employee Advances Routes
  app.post('/api/employee-advances', isAuthenticated, async (req, res) => {
    try {
      const validatedData = schema.insertEmployeeAdvanceSchema.parse(req.body);
      const advance = await storage.requestAdvance(validatedData);
      res.status(201).json(advance);
    } catch (error) {
      console.error('Error requesting advance:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid advance request data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to request advance' });
      }
    }
  });

  app.get('/api/employee-advances/pending', isAuthenticated, async (req, res) => {
    try {
      const pendingAdvances = await storage.getPendingAdvances();
      res.json(pendingAdvances);
    } catch (error) {
      console.error('Error fetching pending advances:', error);
      res.status(500).json({ message: 'Failed to fetch pending advances' });
    }
  });

  // Payroll Settings Routes
  app.get('/api/payroll-settings', isAuthenticated, async (req, res) => {
    try {
      const settings = await storage.getPayrollSettings();
      res.json(settings);
    } catch (error) {
      console.error('Error fetching payroll settings:', error);
      res.status(500).json({ message: 'Failed to fetch payroll settings' });
    }
  });

  app.put('/api/payroll-settings', isAdminOrManager, async (req, res) => {
    try {
      const validatedData = schema.insertPayrollSettingsSchema.partial().parse(req.body);
      const settings = await storage.updatePayrollSettings(validatedData);

      if (!settings) {
        return res.status(404).json({ message: 'Payroll settings not found' });
      }

      res.json(settings);
    } catch (error) {
      console.error('Error updating payroll settings:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid payroll settings data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to update payroll settings' });
      }
    }
  });

  // Import and mount label printing routes
  const labelPrintingRoutes = await import('./label-printing-routes.js');
  app.use('/api', labelPrintingRoutes.default);

  return httpServer;
}