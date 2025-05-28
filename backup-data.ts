
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pos-data.db');
const backupDir = path.join(process.cwd(), 'backups');

export async function backupData() {
  try {
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `pos-backup-${timestamp}.db`);
    
    // Copy database file
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
      console.log(`✅ Database backed up to: ${backupPath}`);
      
      // Also create a JSON export
      const jsonBackupPath = path.join(backupDir, `pos-data-${timestamp}.json`);
      await exportDataToJSON(jsonBackupPath);
      
      return { dbBackup: backupPath, jsonBackup: jsonBackupPath };
    } else {
      console.log('⚠️ No database file found to backup');
      return null;
    }
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  }
}

export async function exportDataToJSON(outputPath: string) {
  const db = new Database(dbPath);
  
  try {
    const data = {
      timestamp: new Date().toISOString(),
      users: db.prepare('SELECT * FROM users').all(),
      categories: db.prepare('SELECT * FROM categories').all(),
      suppliers: db.prepare('SELECT * FROM suppliers').all(),
      customers: db.prepare('SELECT * FROM customers').all(),
      products: db.prepare('SELECT * FROM products').all(),
      sales: db.prepare('SELECT * FROM sales').all(),
      sale_items: db.prepare('SELECT * FROM sale_items').all(),
      purchases: db.prepare('SELECT * FROM purchases').all(),
      purchase_items: db.prepare('SELECT * FROM purchase_items').all()
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`✅ Data exported to JSON: ${outputPath}`);
  } catch (error) {
    console.error('❌ JSON export failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

export async function restoreFromJSON(jsonPath: string) {
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Backup file not found: ${jsonPath}`);
  }
  
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const db = new Database(dbPath);
  
  try {
    // Clear existing data
    db.exec('DELETE FROM purchase_items');
    db.exec('DELETE FROM purchases');
    db.exec('DELETE FROM sale_items');
    db.exec('DELETE FROM sales');
    db.exec('DELETE FROM products');
    db.exec('DELETE FROM customers');
    db.exec('DELETE FROM suppliers');
    db.exec('DELETE FROM categories');
    db.exec('DELETE FROM users');
    
    // Restore data
    console.log('🔄 Restoring data from backup...');
    
    // Users
    if (data.users?.length) {
      const insertUser = db.prepare(`
        INSERT INTO users (id, username, password, name, email, role, image, active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      data.users.forEach((user: any) => {
        insertUser.run(user.id, user.username, user.password, user.name, user.email, user.role, user.image, user.active, user.created_at);
      });
    }
    
    // Categories
    if (data.categories?.length) {
      const insertCategory = db.prepare(`
        INSERT INTO categories (id, name, description, created_at)
        VALUES (?, ?, ?, ?)
      `);
      data.categories.forEach((cat: any) => {
        insertCategory.run(cat.id, cat.name, cat.description, cat.created_at);
      });
    }
    
    // Suppliers
    if (data.suppliers?.length) {
      const insertSupplier = db.prepare(`
        INSERT INTO suppliers (id, name, email, phone, address, contact_person, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      data.suppliers.forEach((sup: any) => {
        insertSupplier.run(sup.id, sup.name, sup.email, sup.phone, sup.address, sup.contact_person, sup.status, sup.created_at);
      });
    }
    
    // Customers
    if (data.customers?.length) {
      const insertCustomer = db.prepare(`
        INSERT INTO customers (id, name, email, phone, address, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      data.customers.forEach((cust: any) => {
        insertCustomer.run(cust.id, cust.name, cust.email, cust.phone, cust.address, cust.created_at);
      });
    }
    
    // Products
    if (data.products?.length) {
      const insertProduct = db.prepare(`
        INSERT INTO products (id, name, description, sku, price, mrp, cost, weight, weight_unit, category_id, stock_quantity, alert_threshold, barcode, image, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      data.products.forEach((prod: any) => {
        insertProduct.run(prod.id, prod.name, prod.description, prod.sku, prod.price, prod.mrp, prod.cost, prod.weight, prod.weight_unit, prod.category_id, prod.stock_quantity, prod.alert_threshold, prod.barcode, prod.image, prod.active, prod.created_at, prod.updated_at);
      });
    }
    
    console.log('✅ Data restored successfully');
  } catch (error) {
    console.error('❌ Restore failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

// CLI usage
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'backup') {
    backupData().catch(console.error);
  } else if (command === 'restore' && process.argv[3]) {
    restoreFromJSON(process.argv[3]).catch(console.error);
  } else {
    console.log('Usage:');
    console.log('  npx tsx backup-data.ts backup');
    console.log('  npx tsx backup-data.ts restore <backup-file.json>');
  }
}
