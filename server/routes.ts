import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import * as schema from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { db } from "@db";

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
      const existingProduct = await storage.getProductBySku(requestData.sku);
      if (existingProduct) {
        return res.status(400).json({ 
          message: 'A product with this SKU/Item Code already exists' 
        });
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

  // Returns routes
  app.get("/api/returns", async (req, res) => {
    try {
      const { search, limit = 50 } = req.query;

      let query = `
        SELECT r.*, s.orderNumber as saleOrderNumber, s.total as saleTotal,
               c.name as customerName, u.name as userName
        FROM returns r
        LEFT JOIN sales s ON r.saleId = s.id
        LEFT JOIN customers c ON s.customerId = c.id
        LEFT JOIN users u ON r.userId = u.id
      `;
      const params: any[] = [];

      if (search) {
        query += ` WHERE s.orderNumber LIKE ? OR c.name LIKE ?`;
        params.push(`%${search}%`, `%${search}%`);
      }

      query += ` ORDER BY r.createdAt DESC LIMIT ?`;
      params.push(parseInt(limit as string));

      const returns = db.prepare(query).all(params);
      res.json(returns);
    } catch (error) {
      console.error('Error fetching returns:', error);
      res.status(500).json({ message: 'Failed to fetch returns' });
    }
  });

  app.post("/api/returns", async (req, res) => {
    try {
      const { saleId, items, refundMethod, totalRefund, reason, notes } = req.body;
      const userId = req.user?.id || 1;

      // Start transaction
      const insertReturn = db.prepare(`
        INSERT INTO returns (saleId, userId, totalRefund, refundMethod, reason, notes, status, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, 'completed', ?)
      `);

      const insertReturnItem = db.prepare(`
        INSERT INTO return_items (returnId, productId, quantity, unitPrice, subtotal)
        VALUES (?, ?, ?, ?, ?)
      `);

      const updateProductStock = db.prepare(`
        UPDATE products SET stockQuantity = stockQuantity + ? WHERE id = ?
      `);

      const now = new Date().toISOString();
      const result = insertReturn.run(saleId, userId, totalRefund, refundMethod, reason, notes || '', now);
      const returnId = result.lastInsertRowid;

      // Insert return items and update stock
      for (const item of items) {
        insertReturnItem.run(returnId, item.productId, item.quantity, item.unitPrice, item.subtotal);
        updateProductStock.run(item.quantity, item.productId);
      }

      res.json({ 
        id: returnId, 
        message: 'Return processed successfully'
      });
    } catch (error) {
      console.error('Error processing return:', error);
      res.status(500).json({ message: 'Failed to process return' });
    }
  });

  // Sales API
  app.post("/api/sales", async (req, res) => {
    try {
      console.log("Processing sale request:", req.body);

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
      const orderNumber = billNumber || `SALE-${Date.now()}`;

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
          price: unitPrice, // Add price field for database compatibility
          subtotal: itemSubtotal,
          total: itemSubtotal // Add total field for database compatibility
        };
      });

      console.log("Validated sale items:", saleItems);

      // Use the createSaleWithItems method from storage
      const saleData = {
        orderNumber,
        customerId: safeCustomerId,
        userId,
        total: parseFloat(total),
        tax: parseFloat(tax || "0"),
        discount: parseFloat(discount || "0"),
        paymentMethod: paymentMethod || "cash",
        status: status || "completed"
      };

      console.log("Creating sale with data:", saleData);

      // Create the sale using the correct storage method
      const newSale = await storage.createSaleWithItems(saleData, saleItems);

      // Return success response
      const responseData = {
        id: newSale.id,
        saleId: newSale.id,
        billNumber: orderNumber,
        total: parseFloat(total),
        change: parseFloat(change || "0"),
        paymentMethod: paymentMethod || "cash",
        status: "completed",
        message: "Sale completed successfully",
        timestamp: new Date().toISOString()
      };

      console.log("Sale completed successfully:", responseData);
      res.status(201).json(responseData);

    } catch (error) {
      console.error("Error creating sale:", error);

      // Return detailed error information
      const errorResponse = {
        error: "Transaction failed",
        message: error.message || "Internal server error occurred",
        details: "Please check your connection and try again",
        timestamp: new Date().toISOString()
      };

      res.status(500).json(errorResponse);
    }
  });

  app.get('/api/sales', isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string || '20');
      const offset = parseInt(req.query.offset as string || '0');
      const search = req.query.search as string;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : undefined;

      // If search is provided, use a different approach to search sales
      if (search) {
        const { sqlite } = await import('@db');
        
        let query = `
          SELECT s.*, c.name as customerName, c.phone as customerPhone, u.name as userName
          FROM sales s
          LEFT JOIN customers c ON s.customerId = c.id
          LEFT JOIN users u ON s.userId = u.id
          WHERE (
            s.orderNumber LIKE ? OR
            c.name LIKE ? OR
            c.phone LIKE ? OR
            c.email LIKE ?
          )
        `;
        
        const params = [
          `%${search}%`,
          `%${search}%`, 
          `%${search}%`,
          `%${search}%`
        ];

        if (startDate) {
          query += ` AND s.createdAt >= ?`;
          params.push(startDate.toISOString());
        }
        
        if (endDate) {
          query += ` AND s.createdAt <= ?`;
          params.push(endDate.toISOString());
        }

        query += ` ORDER BY s.createdAt DESC LIMIT ?`;
        params.push(limit);

        const sales = sqlite.prepare(query).all(params);
        
        // Format the results to match expected structure
        const formattedSales = sales.map(sale => ({
          ...sale,
          customer: sale.customerName ? {
            id: sale.customerId,
            name: sale.customerName,
            phone: sale.customerPhone
          } : null,
          user: {
            id: sale.userId,
            name: sale.userName
          }
        }));

        return res.json(formattedSales);
      }

      const sales = await storage.listSales(limit, offset, startDate, endDate, userId, customerId);
      res.json(sales);
    } catch (error) {
      console.error('Error fetching sales:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  });

  app.get('/api/sales/recent', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string || '5');
      const sales = await storage.getRecentSales(limit);
      res.json(sales || []);
    } catch (error) {
      console.error('Error fetching recent sales:', error);
      // Return empty array instead of error to prevent client-side refresh
      res.json([]);
    }
  });

  app.get("/api/sales/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const sale = db.prepare(`
      SELECT s.*, c.name as customerName, c.phone as customerPhone, u.name as userName
      FROM sales s
      LEFT JOIN customers c ON s.customerId = c.id
      LEFT JOIN users u ON s.userId = u.id
      WHERE s.id = ?
    `).get(id);

    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    // Get sale items
    const items = db.prepare(`
      SELECT si.*, p.name as productName, p.sku, p.price as productPrice
      FROM sale_items si
      LEFT JOIN products p ON si.productId = p.id
      WHERE si.saleId = ?
    `).all(id);

    // Format the sale data to match the expected structure
    const formattedSale = {
      ...sale,
      customer: sale.customerName ? {
        id: sale.customerId,
        name: sale.customerName,
        phone: sale.customerPhone
      } : null,
      user: {
        id: sale.userId,
        name: sale.userName
      },
      items: items.map(item => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unit_price || item.price || '0',
        subtotal: item.subtotal || '0',
        product: {
          id: item.productId,
          name: item.productName,
          sku: item.sku,
          price: item.productPrice
        }
      }))
    };

    res.json(formattedSale);
  } catch (error) {
    console.error('Error fetching sale:', error);
    res.status(500).json({ message: 'Failed to fetch sale' });
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
      const supplierData = schema.supplierInsertSchema.parse(req.body);
      const supplier = await storage.createSupplier(supplierData);
      res.status(201).json(supplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating supplier:', error);
      res.status(500).json({ message: 'Internal server error' });
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
      const deleted = await storage.deleteSupplier(id);

      if (!deleted) {
        return res.status(404).json({ message: 'Supplier not found' });
      }

      res.json({ message: 'Supplier deleted successfully' });
    } catch (error) {
      console.error('Error deleting supplier:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Customers API
  app.get('/api/customers', async (req, res) => {
    try {
      const customers = await storage.listCustomers();
      res.json(customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ message: 'Internal server error' });
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

  app.post('/api/customers', isAuthenticated, async (req, res) => {
    try {
      const customerData = schema.customerInsertSchema.parse(req.body);
      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating customer:', error);
      res.status(500).json({ message: 'Internal server error' });
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

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}