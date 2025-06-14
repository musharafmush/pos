
import Database from "better-sqlite3";
import path from "path";

async function addPaidAmountColumn() {
  console.log("🔧 Adding paidAmount column to purchases table...");
  
  const dbPath = path.join(process.cwd(), "pos-data.db");
  const db = new Database(dbPath);
  
  try {
    // Check if the column already exists
    const tableInfo = db.prepare("PRAGMA table_info(purchases)").all();
    const hasColumn = tableInfo.some((col: any) => col.name === 'paid_amount');
    
    if (!hasColumn) {
      console.log("Adding paid_amount column...");
      db.exec(`
        ALTER TABLE purchases 
        ADD COLUMN paid_amount REAL DEFAULT 0;
      `);
      
      // Initialize existing records with 0 paid amount
      db.exec(`
        UPDATE purchases 
        SET paid_amount = 0 
        WHERE paid_amount IS NULL;
      `);
      
      console.log("✅ paid_amount column added successfully");
    } else {
      console.log("✅ paid_amount column already exists");
    }
    
    // Update payment status for existing records
    console.log("Updating payment status for existing records...");
    db.exec(`
      UPDATE purchases 
      SET payment_status = 'due' 
      WHERE payment_status IS NULL;
    `);
    
    console.log("✅ Payment status updated for existing records");
    
    db.close();
    console.log("🎉 Database update completed successfully!");
    
  } catch (error) {
    console.error("❌ Error updating database:", error);
    db.close();
    process.exit(1);
  }
}

// Run the migration
addPaidAmountColumn().catch(console.error);
