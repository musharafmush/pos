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
      const products = await storage.listProducts();
      res.json(products);
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ message: 'Internal server error' });
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
      const product = await storage.getProductById(id);

      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      res.json(product);
    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).json({ message: 'Internal server error' });
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
      const productData = schema.productInsertSchema.parse(req.body);
      const product = await storage.updateProduct(id, productData);

      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error updating product:', error);
      res.status(500).json({ message: 'Internal server error' });
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
      console.log('🔄 Restoring data from backup...');

      let backupData;
      try {
        if (req.body.backup) {
          // Handle JSON string backup data
          if (typeof req.body.backup === 'string') {
            backupData = JSON.parse(req.body.backup);
          } else {
            backupData = req.body.backup;
          }
        } else {
          return res.status(400).json({ error: 'No backup data provided' });
        }

        // Validate backup structure
        if (!backupData.data || !backupData.timestamp) {
          return res.status(400).json({ error: 'Invalid backup file format' });
        }

        console.log('📦 Backup validation passed, starting restore...');
      } catch (parseError) {
        console.error('❌ Error parsing backup data:', parseError);
        return res.status(400).json({ error: 'Invalid JSON format in backup file' });
      }

      const { sqlite } = await import('@db');

      // Start transaction
      const restoreTransaction = sqlite.transaction(() => {
        try {
          console.log('🗑️ Clearing existing data...');
          
          // Clear existing data (in reverse order due to foreign keys)
          sqlite.prepare('DELETE FROM purchase_items').run();
          sqlite.prepare('DELETE FROM sale_items').run();
          sqlite.prepare('DELETE FROM purchases').run();
          sqlite.prepare('DELETE FROM sales').run();
          sqlite.prepare('DELETE FROM products').run();
          sqlite.prepare('DELETE FROM customers').run();
          sqlite.prepare('DELETE FROM suppliers').run();
          sqlite.prepare('DELETE FROM categories').run();
          sqlite.prepare('DELETE FROM settings WHERE key NOT IN ("admin_setup")').run();

          // Reset auto-increment sequences
          sqlite.prepare('DELETE FROM sqlite_sequence').run();

          const data = backupData.data;
          console.log('📊 Backup contains:', {
            categories: data.categories?.length || 0,
            suppliers: data.suppliers?.length || 0,
            customers: data.customers?.length || 0,
            products: data.products?.length || 0,
            sales: data.sales?.length || 0,
            purchases: data.purchases?.length || 0
          });

          // Restore categories
          if (data.categories?.length) {
            console.log(`📂 Restoring ${data.categories.length} categories...`);
            const insertCategory = sqlite.prepare('INSERT INTO categories (id, name, description, created_at) VALUES (?, ?, ?, ?)');
            data.categories.forEach(cat => {
              insertCategory.run(cat.id, cat.name, cat.description || null, cat.created_at);
            });
          }

          // Restore suppliers
          if (data.suppliers?.length) {
            console.log(`🏢 Restoring ${data.suppliers.length} suppliers...`);
            const insertSupplier = sqlite.prepare(`
              INSERT INTO suppliers (id, name, email, phone, mobile_no, extension_number, fax_no, contact_person, address, building, street, city, state, country, pin_code, landmark, tax_id, registration_type, registration_number, supplier_type, credit_days, discount_percent, notes, status, created_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            data.suppliers.forEach(sup => {
              insertSupplier.run(
                sup.id, sup.name, sup.email || null, sup.phone || null, sup.mobile_no || null, 
                sup.extension_number || null, sup.fax_no || null, sup.contact_person || null, 
                sup.address || null, sup.building || null, sup.street || null, sup.city || null, 
                sup.state || null, sup.country || null, sup.pin_code || null, sup.landmark || null, 
                sup.tax_id || null, sup.registration_type || null, sup.registration_number || null, 
                sup.supplier_type || null, sup.credit_days || null, sup.discount_percent || null, 
                sup.notes || null, sup.status || 'active', sup.created_at
              );
            });
          }

          // Restore customers
          if (data.customers?.length) {
            console.log(`👥 Restoring ${data.customers.length} customers...`);
            const insertCustomer = sqlite.prepare('INSERT INTO customers (id, name, email, phone, address, tax_id, credit_limit, business_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
            data.customers.forEach(cust => {
              insertCustomer.run(
                cust.id, cust.name, cust.email || null, cust.phone || null, 
                cust.address || null, cust.tax_id || null, cust.credit_limit || 0, 
                cust.business_name || null, cust.created_at
              );
            });
          }

          // Restore products
          if (data.products?.length) {
            console.log(`📦 Restoring ${data.products.length} products...`);
            const insertProduct = sqlite.prepare(`
              INSERT INTO products (id, name, description, sku, price, mrp, cost, weight, weight_unit, category_id, stock_quantity, alert_threshold, barcode, image, active, created_at, updated_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            data.products.forEach(prod => {
              insertProduct.run(
                prod.id, prod.name, prod.description || null, prod.sku, 
                prod.price, prod.mrp || prod.price, prod.cost || 0, 
                prod.weight || null, prod.weight_unit || 'kg', prod.category_id, 
                prod.stock_quantity || 0, prod.alert_threshold || 5, 
                prod.barcode || null, prod.image || null, prod.active !== false ? 1 : 0, 
                prod.created_at, prod.updated_at
              );
            });
          }

          // Restore sales
          if (data.sales?.length) {
            console.log(`💰 Restoring ${data.sales.length} sales...`);
            const insertSale = sqlite.prepare(`
              INSERT INTO sales (id, order_number, customer_id, user_id, total, tax, discount, payment_method, status, created_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            data.sales.forEach(sale => {
              insertSale.run(
                sale.id, sale.order_number || `SALE-${sale.id}`, sale.customer_id || null, 
                sale.user_id || 1, sale.total, sale.tax || 0, sale.discount || 0, 
                sale.payment_method || 'cash', sale.status || 'completed', sale.created_at
              );
            });

            // Restore sale items
            if (data.sale_items?.length) {
              console.log(`📋 Restoring ${data.sale_items.length} sale items...`);
              const insertSaleItem = sqlite.prepare(`
                INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, price, subtotal, total) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `);
              data.sale_items.forEach(item => {
                insertSaleItem.run(
                  item.id, item.sale_id, item.product_id, item.quantity, 
                  item.unit_price || item.price, item.price || item.unit_price, 
                  item.subtotal || item.total, item.total || item.subtotal
                );
              });
            }
          }

          // Restore purchases
          if (data.purchases?.length) {
            console.log(`🛒 Restoring ${data.purchases.length} purchases...`);
            const insertPurchase = sqlite.prepare(`
              INSERT INTO purchases (id, purchase_number, order_number, supplier_id, user_id, total, status, order_date, created_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            data.purchases.forEach(purchase => {
              insertPurchase.run(
                purchase.id, purchase.purchase_number || `PO-${purchase.id}`, 
                purchase.order_number || purchase.purchase_number || `PO-${purchase.id}`, 
                purchase.supplier_id, purchase.user_id || 1, purchase.total, 
                purchase.status || 'pending', purchase.order_date || purchase.created_at, 
                purchase.created_at
              );
            });

            // Restore purchase items
            if (data.purchase_items?.length) {
              console.log(`📦 Restoring ${data.purchase_items.length} purchase items...`);
              const insertPurchaseItem = sqlite.prepare(`
                INSERT INTO purchase_items (id, purchase_id, product_id, quantity, received_qty, unit_cost, subtotal) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `);
              data.purchase_items.forEach(item => {
                insertPurchaseItem.run(
                  item.id, item.purchase_id, item.product_id, item.quantity, 
                  item.received_qty || item.quantity, item.unit_cost, 
                  item.subtotal || (item.quantity * item.unit_cost)
                );
              });
            }
          }

          // Restore settings
          if (data.settings?.length) {
            console.log(`⚙️ Restoring ${data.settings.length} settings...`);
            const insertSetting = sqlite.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)');
            data.settings.forEach(setting => {
              if (setting.key !== 'admin_setup') {
                insertSetting.run(setting.key, setting.value, setting.updated_at);
              }
            });
          }

          console.log('✅ All data restored successfully');
        } catch (transactionError) {
          console.error('❌ Transaction error:', transactionError);
          throw transactionError;
        }
      });

      restoreTransaction();

      res.json({ 
        success: true, 
        message: 'Data restored successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error restoring backup:', error);
      res.status(500).json({ 
        error: 'Failed to restore backup',
        message: error.message,
        details: error.stack
      });
    }
  });

  app.post('/api/data/clear', async (req, res) => {
    try {
      console.log('🔄 Clearing all data...');

      const { sqlite } = await import('@db');

      // Start transaction to clear all data
      const clearTransaction = sqlite.transaction(() => {
        // Clear data in order to respect foreign key constraints
        sqlite.prepare('DELETE FROM purchase_items').run();
        sqlite.prepare('DELETE FROM sale_items').run();
        sqlite.prepare('DELETE FROM purchases').run();
        sqlite.prepare('DELETE FROM sales').run();
        sqlite.prepare('DELETE FROM products').run();
        sqlite.prepare('DELETE FROM customers').run();
        sqlite.prepare('DELETE FROM suppliers').run();
        sqlite.prepare('DELETE FROM categories').run();
        sqlite.prepare('DELETE FROM settings WHERE key NOT IN ("admin_setup")').run(); // Keep essential settings

        // Reset auto-increment counters
        sqlite.prepare('DELETE FROM sqlite_sequence').run();

        console.log('✅ All data cleared successfully');
      });

      clearTransaction();

      res.json({ 
        success: true, 
        message: 'All data cleared successfully' 
      });

    } catch (error) {
      console.error('❌ Error clearing data:', error);
      res.status(500).json({ 
        error: 'Failed to clear data',
        message: error.message 
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

  app.get('/api/purchases', isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string || '20');
      const offset = parseInt(req.query.offset as string || '0');

      // Use direct DB query to avoid the complex ORM issues
      const result = await db.query.purchases.findMany({
        limit,
        offset,
        orderBy: (purchases, { desc }) => [desc(purchases.createdAt)],
        with: {
          supplier: true,
          user: true
        }
      });

      console.log(`Found ${result.length} purchases`);
      res.json(result);
    } catch (error) {
      console.error('Error fetching purchases:', error);
      res.status(500).json({ message: 'Internal server error' });
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

  app.put('/api/purchases/:id/status', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, receivedDate } = req.body;

      if (!status) {
        return res.status(400).json({ message: 'Status is required' });
      }

      const purchase = await storage.updatePurchaseStatus(
        id,
        status,
        receivedDate ? new Date(receivedDate) : undefined
      );

      if (!purchase) {
        return res.status(404).json({ message: 'Purchase not found' });
      }

      res.json(purchase);
    } catch (error) {
      console.error('Error updating purchase status:', error);
      res.status(500).json({ message: 'Internal server error' });
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
app.delete("/api/purchases/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));

    if (isNaN(id)) {
      return c.json({ error: "Invalid purchase ID" }, 400);
    }

    // Start a transaction to ensure data consistency
    const deleteTransaction = db.transaction(() => {
      // First delete related purchase items
      const deleteItemsStmt = db.prepare("DELETE FROM purchase_items WHERE purchase_id = ?");
      const itemsResult = deleteItemsStmt.run(id);

      // Then delete the purchase
      const deletePurchaseStmt = db.prepare("DELETE FROM purchases WHERE id = ?");
      const purchaseResult = deletePurchaseStmt.run(id);

      return { itemsDeleted: itemsResult.changes, purchaseDeleted: purchaseResult.changes };
    });

    const result = deleteTransaction();

    if (result.purchaseDeleted === 0) {
      return c.json({ error: "Purchase not found" }, 404);
    }

    console.log(`Deleted purchase ${id} with ${result.itemsDeleted} items`);
    return c.json({ 
      success: true, 
      message: "Purchase deleted successfully",
      itemsDeleted: result.itemsDeleted
    });
  } catch (error: any) {
    console.error("Error deleting purchase:", error);
    return c.json({ error: `Failed to delete purchase: ${error.message}` }, 500);
  }
});

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}