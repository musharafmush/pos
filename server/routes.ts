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
import pgSession from "connect-pg-simple";
import { pool } from "@db";

// Define authentication middleware
const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
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
  // Configure session storage
  const PostgresqlStore = pgSession(session);
  const sessionStore = new PostgresqlStore({
    pool: pool, // Use the same pool we use for the database
    tableName: 'user_sessions',
    createTableIfMissing: true,
  });

  // Configure sessions
  app.use(session({
    store: sessionStore,
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

  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));

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
  app.post('/api/auth/login', passport.authenticate('local'), (req, res) => {
    // Remove password field from response
    const user = { ...req.user as any };
    delete user.password;
    res.json({ user });
  });
  
  app.post('/api/auth/register', async (req, res) => {
    try {
      // Validate user data
      const userData = schema.userInsertSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user (default role is 'cashier' as defined in schema)
      const newUser = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      // Auto login after registration
      req.login(newUser, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Error logging in after registration' });
        }
        
        // Remove password from response
        const user = { ...newUser };
        delete user.password;
        res.status(201).json({ user });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error registering user:', error);
      res.status(500).json({ message: 'Internal server error' });
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
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = { ...req.user as any };
    delete user.password;
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
      const productData = schema.productInsertSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating product:', error);
      res.status(500).json({ message: 'Internal server error' });
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

  app.delete('/api/products/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteProduct(id);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Sales API
  app.post('/api/sales', isAuthenticated, async (req, res) => {
    try {
      const { items, ...saleData } = req.body;
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Sale must have at least one item' });
      }
      
      const parsedSaleData = {
        customerId: saleData.customerId,
        tax: parseFloat(saleData.tax || 0),
        discount: parseFloat(saleData.discount || 0),
        paymentMethod: saleData.paymentMethod,
        status: saleData.status
      };

      const parsedItems = items.map(item => ({
        productId: item.productId,
        quantity: parseInt(item.quantity),
        unitPrice: parseFloat(item.unitPrice)
      }));

      const sale = await storage.createSale(
        (req.user as any).id,
        parsedItems,
        parsedSaleData
      );
      
      res.status(201).json(sale);
    } catch (error) {
      console.error('Error creating sale:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/sales', isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string || '20');
      const offset = parseInt(req.query.offset as string || '0');
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : undefined;
      
      const sales = await storage.listSales(limit, offset, startDate, endDate, userId, customerId);
      res.json(sales);
    } catch (error) {
      console.error('Error fetching sales:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/sales/recent', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string || '5');
      const sales = await storage.getRecentSales(limit);
      res.json(sales);
    } catch (error) {
      console.error('Error fetching recent sales:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/sales/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const sale = await storage.getSaleById(id);
      
      if (!sale) {
        return res.status(404).json({ message: 'Sale not found' });
      }
      
      res.json(sale);
    } catch (error) {
      console.error('Error fetching sale:', error);
      res.status(500).json({ message: 'Internal server error' });
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
      
      const parsedItems = items.map(item => ({
        productId: item.productId,
        quantity: parseInt(item.quantity),
        unitCost: parseFloat(item.unitCost)
      }));

      const purchase = await storage.createPurchase(
        (req.user as any).id,
        parseInt(supplierId),
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
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const supplierId = req.query.supplierId ? parseInt(req.query.supplierId as string) : undefined;
      const status = req.query.status as string;
      
      const purchases = await storage.listPurchases(limit, offset, startDate, endDate, supplierId, status);
      res.json(purchases);
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

  app.get('/api/customers/search', async (req, res) => {
    try {
      const term = req.query.q as string || '';
      const customers = await storage.searchCustomers(term);
      res.json(customers);
    } catch (error) {
      console.error('Error searching customers:', error);
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

  // Users API
  app.get('/api/users', isAdmin, async (req, res) => {
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
  
  app.get('/api/users/roles', isAuthenticated, async (req, res) => {
    try {
      // Return the available roles
      res.json(['admin', 'manager', 'cashier']);
    } catch (error) {
      console.error('Error fetching roles:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/users', isAdmin, async (req, res) => {
    try {
      const userData = schema.userInsertSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
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

  app.put('/api/users/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const currentUser = req.user as any;
      
      // Only allow users to update their own profile or admins to update any profile
      if (currentUser.id !== id && currentUser.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      // Get current user data
      const existingUser = await storage.getUserById(id);
      if (!existingUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Handle password updates specially
      let userData = { ...req.body };
      
      if (userData.password) {
        // If password is being changed, hash it
        userData.password = await bcrypt.hash(userData.password, 10);
      } else {
        // If not changing password, remove it from the update
        delete userData.password;
      }
      
      // Remove sensitive fields if not admin
      if (currentUser.role !== 'admin') {
        delete userData.role;
        delete userData.active;
      }
      
      const user = await storage.updateUser(id, userData);
      
      // Remove password from response
      const { password, ...safeUser } = user;
      
      res.json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Add endpoint to change user status (active/inactive) - admin only
  app.put('/api/users/:id/status', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { active } = req.body;
      
      if (typeof active !== 'boolean') {
        return res.status(400).json({ message: 'Active status must be a boolean' });
      }
      
      const user = await storage.updateUser(id, { active });
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Remove password from response
      const { password, ...safeUser } = user;
      
      res.json(safeUser);
    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Add endpoint to change user role - admin only
  app.put('/api/users/:id/role', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { role } = req.body;
      
      if (!role || !['admin', 'manager', 'cashier'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }
      
      const user = await storage.updateUser(id, { role });
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Remove password from response
      const { password, ...safeUser } = user;
      
      res.json(safeUser);
    } catch (error) {
      console.error('Error updating user role:', error);
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

  app.get('/api/dashboard/sales-chart', async (req, res) => {
    try {
      const days = parseInt(req.query.days as string || '7');
      const salesData = await storage.getDailySalesData(days);
      res.json(salesData);
    } catch (error) {
      console.error('Error fetching sales chart data:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/dashboard/top-products', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string || '5');
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const topProducts = await storage.getTopSellingProducts(limit, startDate, endDate);
      res.json(topProducts);
    } catch (error) {
      console.error('Error fetching top products:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
