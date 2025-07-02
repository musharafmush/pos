import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './shared/schema.js';

async function setupPostgreSQLDatabase() {
  try {
    console.log('🔄 Setting up PostgreSQL database...');
    
    // Connect to PostgreSQL using DATABASE_URL
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    const client = postgres(connectionString, { max: 1 });
    const db = drizzle(client, { schema });
    
    console.log('✅ Connected to PostgreSQL database');
    
    // Create tables
    console.log('🔄 Creating tables...');
    
    // Create users table
    await client`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        image TEXT,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create categories table
    await client`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create suppliers table
    await client`
      CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255),
        phone VARCHAR(20),
        email VARCHAR(255),
        address TEXT,
        gstin VARCHAR(50),
        type VARCHAR(50) DEFAULT 'regular',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create customers table
    await client`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(255),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        pincode VARCHAR(10),
        gstin VARCHAR(50),
        loyalty_tier VARCHAR(50) DEFAULT 'member',
        loyalty_points INTEGER DEFAULT 0,
        total_purchases DECIMAL(10,2) DEFAULT 0,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create products table
    await client`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        sku VARCHAR(100) UNIQUE,
        barcode VARCHAR(100),
        category_id INTEGER REFERENCES categories(id),
        description TEXT,
        unit VARCHAR(50) DEFAULT 'pcs',
        purchase_price DECIMAL(10,2) DEFAULT 0,
        selling_price DECIMAL(10,2) DEFAULT 0,
        mrp DECIMAL(10,2) DEFAULT 0,
        weight DECIMAL(10,3),
        stock_quantity INTEGER DEFAULT 0,
        min_order_qty INTEGER DEFAULT 1,
        model VARCHAR(100),
        size VARCHAR(50),
        color VARCHAR(50),
        material VARCHAR(100),
        supplier_id INTEGER REFERENCES suppliers(id),
        hsn_code VARCHAR(20),
        tax_rate DECIMAL(5,2) DEFAULT 0,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create label_templates table
    await client`
      CREATE TABLE IF NOT EXISTS label_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        font_size INTEGER NOT NULL,
        orientation VARCHAR(20) DEFAULT 'portrait',
        include_barcode BOOLEAN DEFAULT true,
        include_price BOOLEAN DEFAULT true,
        include_description BOOLEAN DEFAULT false,
        include_mrp BOOLEAN DEFAULT false,
        include_weight BOOLEAN DEFAULT false,
        include_sku BOOLEAN DEFAULT false,
        include_category BOOLEAN DEFAULT false,
        include_brand BOOLEAN DEFAULT false,
        include_model BOOLEAN DEFAULT false,
        include_size BOOLEAN DEFAULT false,
        include_color BOOLEAN DEFAULT false,
        include_material BOOLEAN DEFAULT false,
        include_manufacturing_date BOOLEAN DEFAULT false,
        include_expiry_date BOOLEAN DEFAULT false,
        custom_css TEXT,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create print_jobs table
    await client`
      CREATE TABLE IF NOT EXISTS print_jobs (
        id SERIAL PRIMARY KEY,
        template_id INTEGER REFERENCES label_templates(id),
        user_id INTEGER REFERENCES users(id),
        product_ids TEXT,
        total_labels INTEGER DEFAULT 1,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    console.log('✅ All tables created successfully');
    
    // Create admin user if not exists
    const adminUser = await client`
      SELECT id FROM users WHERE username = 'admin'
    `;
    
    if (adminUser.length === 0) {
      console.log('🔄 Creating admin user...');
      await client`
        INSERT INTO users (username, password, name, email, role)
        VALUES (
          'admin',
          '$2b$10$8.BwYDEVNPoNrNsQqZ.eoufNUkxaOEAjRSDaNJVOSi3wSYO34pyeu',
          'Administrator',
          'admin@pos.local',
          'admin'
        )
      `;
      console.log('✅ Admin user created');
    } else {
      console.log('✅ Admin user already exists');
    }
    
    // Create sample data
    console.log('🔄 Creating sample categories...');
    await client`
      INSERT INTO categories (name, description) 
      VALUES 
        ('Food & Beverages', 'Food items and drinks'),
        ('Electronics', 'Electronic items and gadgets'),
        ('General', 'General merchandise')
      ON CONFLICT DO NOTHING
    `;
    
    console.log('🔄 Creating sample products...');
    await client`
      INSERT INTO products (name, sku, barcode, category_id, selling_price, mrp, stock_quantity)
      VALUES 
        ('Sugar Bulk', 'SUGAR-001', '1234567890123', 1, 12.00, 15.00, 100),
        ('Basmati Rice', 'RICE-001', '1234567890124', 1, 45.00, 50.00, 50),
        ('Cooking Oil', 'OIL-001', '1234567890125', 1, 95.00, 100.00, 25)
      ON CONFLICT (sku) DO NOTHING
    `;
    
    console.log('🔄 Creating sample label templates...');
    await client`
      INSERT INTO label_templates (
        name, description, width, height, font_size, orientation,
        include_barcode, include_price, include_description, include_mrp
      )
      VALUES 
        ('Standard Product Label', 'Standard product label with barcode and price', 100, 60, 14, 'landscape', true, true, true, true),
        ('Price Tag Only', 'Simple price tag for retail', 80, 40, 16, 'portrait', false, true, false, false),
        ('Detailed Product Label', 'Comprehensive product information', 120, 80, 12, 'portrait', true, true, true, true)
      ON CONFLICT DO NOTHING
    `;
    
    console.log('🎉 PostgreSQL database setup completed successfully!');
    
    await client.end();
    
  } catch (error) {
    console.error('❌ Error setting up PostgreSQL database:', error);
    throw error;
  }
}

// Run the setup
setupPostgreSQLDatabase().catch(console.error);