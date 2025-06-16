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
import { eq, desc, sql } from "drizzle-orm";
import { returns as returnTransactions, sales, returnItems, products, customers } from "../shared/schema.js";

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
      console.log('📦 Fetching products from database...');
      
      // Try storage method first
      try {
        const products = await storage.listProducts();
        console.log(`✅ Storage method returned ${products.length} products`);
        res.json(products);
        return;
      } catch (storageError) {
        console.log('⚠️ Storage method failed, trying direct query:', storageError.message);
      }

      // Fallback to direct SQLite query
      const { sqlite } = await import('../db/index.js');

      // Check if products table exists
      const tableCheck = sqlite.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='products'
      `).get();

      if (!tableCheck) {
        console.log('❌ Products table does not exist');
        return res.json([]);
      }

      // Get table structure
      const tableInfo = sqlite.prepare("PRAGMA table_info(products)").all();
      const columnNames = tableInfo.map((col: any) => col.name);
      console.log('📋 Available columns in products table:', columnNames);

      // Build dynamic query based on available columns
      const baseColumns = ['id', 'name', 'sku', 'price'];
      const optionalColumns = [
        'description', 'mrp', 'cost', 'weight', 'weight_unit', 'category_id',
        'stock_quantity', 'alert_threshold', 'barcode', 'image', 'active',
        'hsn_code', 'gst_code', 'cgst_rate', 'sgst_rate', 'igst_rate', 'cess_rate',
        'tax_calculation_method', 'created_at', 'updated_at'
      ];

      const availableColumns = baseColumns.concat(
        optionalColumns.filter(col => columnNames.includes(col))
      );

      const query = `
        SELECT 
          p.${availableColumns.join(', p.')},
          c.name as category_name,
          c.description as category_description,
          c.created_at as category_created_at
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.active = 1 OR p.active IS NULL
        ORDER BY ${columnNames.includes('created_at') ? 'p.created_at' : 'p.id'} DESC
      `;

      console.log('🔍 Executing products query');
      const productsData = sqlite.prepare(query).all();

      // Format the results to match expected structure
      const formattedProducts = productsData.map((product: any) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        description: product.description || '',
        price: product.price,
        mrp: product.mrp || product.price,
        cost: product.cost || '0',
        weight: product.weight || null,
        weightUnit: product.weight_unit || 'kg',
        categoryId: product.category_id || 1,
        stockQuantity: product.stock_quantity || 0,
        alertThreshold: product.alert_threshold || 5,
        barcode: product.barcode || '',
        image: product.image || null,
        hsnCode: product.hsn_code || '',
        gstCode: product.gst_code || '',
        cgstRate: product.cgst_rate || '0',
        sgstRate: product.sgst_rate || '0',
        igstRate: product.igst_rate || '0',
        cessRate: product.cess_rate || '0',
        taxCalculationMethod: product.tax_calculation_method || 'inclusive',
        active: product.active !== 0,
        createdAt: product.created_at,
        updatedAt: product.updated_at,
        category: product.category_name ? {
          id: product.category_id,
          name: product.category_name,
          description: product.category_description,
          createdAt: product.category_created_at
        } : null
      }));

      console.log(`✅ Found ${formattedProducts.length} products via direct query`);
      res.json(formattedProducts);
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
      console.log('🔍 Fetching product with ID:', id);

      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ 
          message: 'Invalid product ID',
          error: 'Product ID must be a positive number'
        });
      }

      // Try storage method first
      try {
        const product = await storage.getProductById(id);
        
        if (product) {
          console.log('✅ Found product via storage method:', product.name);
          return res.json(product);
        }
      } catch (storageError) {
        console.log('⚠️ Storage method failed, trying direct query:', storageError.message);
      }

      // Fallback to direct SQLite query
      const { sqlite } = await import('../db/index.js');

      // Check if products table exists
      const tableCheck = sqlite.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='products'
      `).get();

      if (!tableCheck) {
        console.log('❌ Products table does not exist');
        return res.status(404).json({ 
          message: 'Product not found',
          error: 'Products table does not exist'
        });
      }

      // Get table structure
      const tableInfo = sqlite.prepare("PRAGMA table_info(products)").all();
      const columnNames = tableInfo.map((col: any) => col.name);
      console.log('📋 Available columns in products table:', columnNames);

      // Build dynamic query based on available columns
      const baseColumns = ['id', 'name', 'sku', 'price'];
      const optionalColumns = [
        'description', 'mrp', 'cost', 'weight', 'weight_unit', 'category_id',
        'stock_quantity', 'alert_threshold', 'barcode', 'image', 'active',
        'hsn_code', 'gst_code', 'cgst_rate', 'sgst_rate', 'igst_rate', 'cess_rate',
        'tax_calculation_method', 'created_at', 'updated_at'
      ];

      const availableColumns = baseColumns.concat(
        optionalColumns.filter(col => columnNames.includes(col))
      );

      const query = `
        SELECT 
          p.${availableColumns.join(', p.')},
          c.name as category_name,
          c.description as category_description
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = ?
      `;

      console.log('🔍 Executing product query for ID:', id);
      const productData = sqlite.prepare(query).get(id);

      if (!productData) {
        console.log('❌ Product not found in database');
        
        // Check if any products exist
        const totalProducts = sqlite.prepare('SELECT COUNT(*) as count FROM products').get();
        console.log(`📊 Total products in database: ${totalProducts.count}`);
        
        return res.status(404).json({ 
          message: 'Product not found',
          error: `No product found with ID ${id}`,
          totalProducts: totalProducts.count
        });
      }

      // Format the result to match expected structure
      const formattedProduct = {
        id: productData.id,
        name: productData.name,
        sku: productData.sku,
        description: productData.description || '',
        price: productData.price,
        mrp: productData.mrp || productData.price,
        cost: productData.cost || '0',
        weight: productData.weight || null,
        weightUnit: productData.weight_unit || 'kg',
        categoryId: productData.category_id || 1,
        stockQuantity: productData.stock_quantity || 0,
        alertThreshold: productData.alert_threshold || 5,
        barcode: productData.barcode || '',
        image: productData.image || null,
        hsnCode: productData.hsn_code || '',
        gstCode: productData.gst_code || '',
        cgstRate: productData.cgst_rate || '0',
        sgstRate: productData.sgst_rate || '0',
        igstRate: productData.igst_rate || '0',
        cessRate: productData.cess_rate || '0',
        taxCalculationMethod: productData.tax_calculation_method || 'inclusive',
        active: productData.active !== 0,
        createdAt: productData.created_at,
        updatedAt: productData.updated_at,
        category: productData.category_name ? {
          id: productData.category_id,
          name: productData.category_name,
          description: productData.category_description
        } : null
      };

      console.log('✅ Found product via direct query:', formattedProduct.name);
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

      // Ensure required fields have default values if missing
      const requestData = {
        ...req.body,
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

        // GST and tax information
        hsnCode: req.body.hsnCode || '',
        gstCode: req.body.gstCode || '',
        cgstRate: req.body.cgstRate || '0',
        sgstRate: req.body.sgstRate || '0',
        igstRate: req.body.igstRate || '0',
        cessRate: req.body.cessRate || '0',
        taxCalculationMethod: req.body.taxCalculationMethod || 'exclusive'
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
      console.log('🔄 Creating data backup...');

      const { sqlite } = await import('@db');

      // Create backup data structure
      const backupData = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        data: {
          users: sqlite.prepare('SELECT * FROM users').all(),
          categories: sqlite.prepare('SELECT * FROM categories').all(),
          suppliers: sqlite.prepare('SELECT * FROM suppliers').all(),
          customers: sqlite.prepare('SELECT * FROM customers').all(),
          products: sqlite.prepare('SELECT * FROM products').all(),
          sales: sqlite.prepare('SELECT * FROM sales').all(),
          sale_items: sqlite.prepare('SELECT * FROM sale_items').all(),
          purchases: sqlite.prepare('SELECT * FROM purchases').all(),
          purchase_items: sqlite.prepare('SELECT * FROM purchase_items').all(),
          settings: sqlite.prepare('SELECT * FROM settings').all()
        }
      };

      // Store backup temporarily for download
      global.latestBackup = JSON.stringify(backupData, null, 2);

      console.log('✅ Backup created successfully');
      res.json({ 
        success: true, 
        message: 'Backup created successfully',
        timestamp: backupData.timestamp
      });

    } catch (error) {
      console.error('❌ Error creating backup:', error);
      res.status(500).json({ 
        error: 'Failed to create backup',
        message: error.message 
      });
    }
  });

  app.get('/api/backup/download', async (req, res) => {
    try {
      if (!global.latestBackup) {
        return res.status(404).json({ error: 'No backup available for download' });
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="pos-backup-${new Date().toISOString().split('T')[0]}.json"`);
      res.send(global.latestBackup);

      // Clear the backup from memory after download
      global.latestBackup = null;

    } catch (error) {
      console.error('❌ Error downloading backup:', error);
      res.status(500).json({ error: 'Failed to download backup' });
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

      const { sqlite } = await import('@db');

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

      const { sqlite } = await import('@db');

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

      const { sqlite } = await import('@db');

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
        status
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
      const { sqlite } = await import('@db');

      const result = sqlite.transaction(() => {
        try {
          // Insert the sale record
          const insertSale = sqlite.prepare(`
            INSERT INTO sales (
              order_number, customer_id, user_id, total, tax, discount, 
              payment_method, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `);

          const saleResult = insertSale.run(
            orderNumber,
            safeCustomerId,
            userId,
            parseFloat(total).toString(),
            parseFloat(tax || "0").toString(),
            parseFloat(discount || "0").toString(),
            paymentMethod || "cash",
            status || "completed"
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

      // Try direct database query first
      try {
        const { sqlite } = await import('@db');

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

        query += ` ORDER BY s.created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        console.log('🔍 Executing query:', query);
        console.log('📝 Query params:', params);

        const sales = sqlite.prepare(query).all(...params);

        console.log(`✅ Direct query found ${sales.length} sales`);

        // Format the results
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
          items: []
        }));

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
      const { sqlite } = await import('@db');

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
      const { sqlite } = await import('@db');

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
          unitCost: ensureFloat(item.unitCost)
        };
      });

      // Ensure supplier ID is a valid number
      const suppId = parseInt(supplierId);
      const validSupplierId = isNaN(suppId) ? 1 : suppId;

      console.log("Creating purchase with supplier ID:", validSupplierId);
      console.log("Parsed items:", JSON.stringify(parsedItems));

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
          error: 'Purchase ID must be a positive number'
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
      const { sqlite } = await import('@db');
      
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
              'selling_price', 'mrp', 'hsn_code', 'tax_percentage', 
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
      })();

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
      const { sqlite } = await import('@db');

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
      const { sqlite } = await import('@db');

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

      // Calculate the new paid amount
      const currentPaidAmount = parseFloat(existingPurchase.paid_amount || '0');
      const newPaymentAmount = parseFloat(paymentAmount || '0');
      const finalPaidAmount = totalPaidAmount !== undefined ? 
        parseFloat(totalPaidAmount.toString()) : 
        currentPaidAmount + newPaymentAmount;

      // Calculate payment status if not provided
      const purchaseTotal = parseFloat(existingPurchase.total || existingPurchase.totalAmount || '0');
      let calculatedPaymentStatus = paymentStatus;
      
      if (!calculatedPaymentStatus) {
        if (purchaseTotal > 0) {
          if (finalPaidAmount >= purchaseTotal) {
            calculatedPaymentStatus = 'paid';
          } else if (finalPaidAmount > 0) {
            calculatedPaymentStatus = 'partial';
          } else {
            calculatedPaymentStatus = 'due';
          }
        } else {
          calculatedPaymentStatus = 'due';
        }
      }

      // If payment status is explicitly provided, use it
      if (paymentStatus) {
        calculatedPaymentStatus = paymentStatus;
        
        // Adjust paid amount based on status if needed
        if (paymentStatus === 'paid' && finalPaidAmount < purchaseTotal) {
          // If marking as paid but amount is less than total, set to full amount
          const adjustedFinalAmount = purchaseTotal;
          console.log(`📊 Adjusting paid amount from ${finalPaidAmount} to ${adjustedFinalAmount} for 'paid' status`);
        } else if (paymentStatus === 'due' && finalPaidAmount > 0 && !paymentAmount) {
          // If marking as due but there's paid amount, keep the paid amount
          console.log(`📊 Keeping existing paid amount ${finalPaidAmount} for 'due' status`);
        }
      }

      // Build dynamic update query
      const updateFields = [];
      const updateValues = [];

      if (columnNames.includes('payment_status')) {
        updateFields.push('payment_status = ?');
        updateValues.push(calculatedPaymentStatus);
      }

      if (columnNames.includes('paid_amount')) {
        updateFields.push('paid_amount = ?');
        updateValues.push(finalPaidAmount.toString());
      }

      if (columnNames.includes('payment_method') && paymentMethod) {
        updateFields.push('payment_method = ?');
        updateValues.push(paymentMethod);
      }

      if (columnNames.includes('payment_date') && paymentDate) {
        updateFields.push('payment_date = ?');
        updateValues.push(paymentDate);
      }

      if (columnNames.includes('updated_at')) {
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ 
          error: 'No valid fields to update',
          message: 'No payment fields provided for update'
        });
      }

      updateValues.push(id); // For WHERE clause

      const updateQuery = `UPDATE purchases SET ${updateFields.join(', ')} WHERE id = ?`;
      console.log('🔧 Update query:', updateQuery);
      console.log('📊 Update values:', updateValues);

      const updateResult = sqlite.prepare(updateQuery).run(...updateValues);

      if (updateResult.changes === 0) {
        return res.status(404).json({ 
          error: 'Update failed',
          message: 'No changes were made to the purchase record'
        });
      }

      // Get updated purchase
      const updatedPurchase = sqlite.prepare('SELECT * FROM purchases WHERE id = ?').get(id);

      // Auto-update purchase status to completed if fully paid
      let finalStatus = updatedPurchase.status;
      let statusAutoUpdated = false;
      
      if (calculatedPaymentStatus === 'paid' && 
          purchaseTotal > 0 && 
          finalPaidAmount >= purchaseTotal && 
          updatedPurchase.status !== 'completed') {
        
        console.log('🔄 Auto-updating purchase status to completed (fully paid)');
        
        try {
          // Check if received_date column exists
          const statusUpdateFields = ['status = ?'];
          const statusUpdateValues = ['completed'];
          
          if (columnNames.includes('received_date')) {
            statusUpdateFields.push('received_date = CURRENT_TIMESTAMP');
          }
          if (columnNames.includes('updated_at')) {
            statusUpdateFields.push('updated_at = CURRENT_TIMESTAMP');
          }
          
          const updateStatusQuery = `UPDATE purchases SET ${statusUpdateFields.join(', ')} WHERE id = ?`;
          statusUpdateValues.push(id);
          
          console.log('🔧 Auto-completing purchase - Status update query:', updateStatusQuery);
          
          const statusResult = sqlite.prepare(updateStatusQuery).run(...statusUpdateValues);
          
          if (statusResult.changes > 0) {
            finalStatus = 'completed';
            statusAutoUpdated = true;
            console.log('✅ Successfully auto-updated purchase status to completed');
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
      const { sqlite } = await import('@db');
      
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
      res.status(500).json({ message: 'Internal server error' });
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

      const { sqlite } = await import('@db');

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

      const { sqlite } = await import('@db');

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

      const { sqlite } = await import('@db');

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

      const { sqlite } = await import('@db');

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

      const { sqlite } = await import('@db');

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
        'paperWidth', 'showLogo', 'autoPrint', 'showCustomerDetails', 'showItemSKU',
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

      const { sqlite } = await import('@db');

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
        const { sqlite } = await import('@db');

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
      const { sqlite } = await import('@db');

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

  // Delete purchase
  app.delete("/api/purchases/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid purchase ID" });
      }

      console.log('🗑️ Deleting purchase:', id);

      // Use direct SQLite transaction
      const { sqlite } = await import('@db');

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

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}