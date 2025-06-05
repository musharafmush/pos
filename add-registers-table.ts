
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { sql } from "drizzle-orm";

const sqlite = new Database("pos-data.db");
const db = drizzle(sqlite);

async function addRegistersTable() {
  try {
    console.log("Adding registers table...");
    
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS registers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        opening_cash DECIMAL(10,2) NOT NULL,
        actual_cash DECIMAL(10,2),
        opened_by VARCHAR(100) NOT NULL,
        opened_at DATETIME NOT NULL,
        closed_at DATETIME,
        status VARCHAR(20) NOT NULL DEFAULT 'open',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log("✅ Registers table created successfully");
    
    // Add register_id column to sales table
    try {
      await db.run(sql`ALTER TABLE sales ADD COLUMN register_id INTEGER`);
      console.log("✅ Added register_id column to sales table");
    } catch (error) {
      if (error.message.includes("duplicate column")) {
        console.log("⚠️ register_id column already exists in sales table");
      } else {
        throw error;
      }
    }
    
    console.log("🎉 Register system setup complete!");
    
  } catch (error) {
    console.error("❌ Error setting up registers table:", error);
  } finally {
    sqlite.close();
  }
}

addRegistersTable();
