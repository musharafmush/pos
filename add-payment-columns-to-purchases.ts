
import { db } from "./db/index.js";

async function addPaymentColumns() {
  try {
    console.log("Adding payment columns to purchases table...");

    // Add payment status column
    await db.run(`
      ALTER TABLE purchases 
      ADD COLUMN payment_status TEXT DEFAULT 'due'
    `).catch(() => {
      console.log("payment_status column already exists or error adding it");
    });

    // Add paid amount column
    await db.run(`
      ALTER TABLE purchases 
      ADD COLUMN paid_amount REAL DEFAULT 0
    `).catch(() => {
      console.log("paid_amount column already exists or error adding it");
    });

    // Add payment method column
    await db.run(`
      ALTER TABLE purchases 
      ADD COLUMN payment_method TEXT
    `).catch(() => {
      console.log("payment_method column already exists or error adding it");
    });

    // Add payment date column
    await db.run(`
      ALTER TABLE purchases 
      ADD COLUMN payment_date TEXT
    `).catch(() => {
      console.log("payment_date column already exists or error adding it");
    });

    console.log("✅ Payment columns added successfully to purchases table");

  } catch (error) {
    console.error("❌ Error adding payment columns:", error);
  }
}

addPaymentColumns().catch(console.error);
