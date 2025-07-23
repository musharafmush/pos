import Database from 'better-sqlite3';

const db = new Database('./pos-data.db');

console.log('🏦 Creating bank accounts tables...');

try {
  // Create bank_accounts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_name TEXT NOT NULL,
      account_number TEXT NOT NULL UNIQUE,
      ifsc_code TEXT,
      bank_name TEXT NOT NULL,
      branch_name TEXT,
      account_type TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      current_balance REAL NOT NULL DEFAULT 0,
      available_balance REAL NOT NULL DEFAULT 0,
      minimum_balance REAL DEFAULT 0,
      interest_rate REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      is_default INTEGER DEFAULT 0,
      opening_date TEXT,
      last_transaction_date TEXT,
      description TEXT,
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);
  console.log('✅ Bank accounts table created');

  // Create bank_transactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bank_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      transaction_id TEXT NOT NULL UNIQUE,
      transaction_type TEXT NOT NULL,
      transaction_mode TEXT NOT NULL,
      amount REAL NOT NULL,
      balance_after REAL NOT NULL,
      description TEXT NOT NULL,
      reference_number TEXT,
      beneficiary_name TEXT,
      beneficiary_account TEXT,
      transfer_account_id INTEGER,
      category TEXT,
      tags TEXT,
      is_reconciled INTEGER DEFAULT 0,
      reconciled_at TEXT,
      receipt_path TEXT,
      notes TEXT,
      processed_by INTEGER,
      transaction_date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES bank_accounts(id),
      FOREIGN KEY (transfer_account_id) REFERENCES bank_accounts(id),
      FOREIGN KEY (processed_by) REFERENCES users(id)
    )
  `);
  console.log('✅ Bank transactions table created');

  // Create bank_account_categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bank_account_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      color TEXT DEFAULT '#3B82F6',
      icon TEXT DEFAULT 'Banknote',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  console.log('✅ Bank account categories table created');

  // Create bank_account_category_links table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bank_account_category_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES bank_accounts(id),
      FOREIGN KEY (category_id) REFERENCES bank_account_categories(id)
    )
  `);
  console.log('✅ Bank account category links table created');

  // Create sample bank account categories
  const existingCategories = db.prepare('SELECT COUNT(*) as count FROM bank_account_categories').get() as { count: number };
  
  if (existingCategories.count === 0) {
    console.log('🔄 Creating sample bank account categories...');
    
    const categories = [
      { name: 'Primary Business', description: 'Main business operating accounts', color: '#10B981', icon: 'Building2' },
      { name: 'Savings', description: 'Business savings and reserve accounts', color: '#3B82F6', icon: 'PiggyBank' },
      { name: 'Current Account', description: 'Daily transaction accounts', color: '#8B5CF6', icon: 'CreditCard' },
      { name: 'Loan Account', description: 'Business loan and credit accounts', color: '#F59E0B', icon: 'TrendingDown' },
      { name: 'Fixed Deposit', description: 'Fixed deposit and investment accounts', color: '#EF4444', icon: 'TrendingUp' },
      { name: 'Petty Cash', description: 'Small cash management accounts', color: '#6B7280', icon: 'Coins' }
    ];

    const insertCategory = db.prepare(`
      INSERT INTO bank_account_categories (name, description, color, icon)
      VALUES (?, ?, ?, ?)
    `);

    for (const category of categories) {
      insertCategory.run(category.name, category.description, category.color, category.icon);
    }
    console.log('✅ Sample bank account categories created');
  }

  // Create sample bank accounts
  const existingAccounts = db.prepare('SELECT COUNT(*) as count FROM bank_accounts').get() as { count: number };
  
  if (existingAccounts.count === 0) {
    console.log('🔄 Creating sample bank accounts...');
    
    const accounts = [
      {
        accountName: 'Business Current Account',
        accountNumber: 'ACC001234567890',
        ifscCode: 'HDFC0000123',
        bankName: 'HDFC Bank',
        branchName: 'Commercial Street',
        accountType: 'current',
        currentBalance: 125000.50,
        availableBalance: 120000.50,
        minimumBalance: 10000,
        isDefault: 1,
        openingDate: '2024-01-15',
        description: 'Primary business account for daily operations'
      },
      {
        accountName: 'Business Savings Account',
        accountNumber: 'SAV001234567891',
        ifscCode: 'ICIC0000456',
        bankName: 'ICICI Bank',
        branchName: 'Business District',
        accountType: 'savings',
        currentBalance: 85000.75,
        availableBalance: 85000.75,
        minimumBalance: 5000,
        interestRate: 3.5,
        openingDate: '2024-02-01',
        description: 'Business savings for emergency funds'
      },
      {
        accountName: 'Petty Cash Account',
        accountNumber: 'CASH001234567892',
        ifscCode: 'SBIN0000789',
        bankName: 'State Bank of India',
        branchName: 'Main Branch',
        accountType: 'current',
        currentBalance: 15000.00,
        availableBalance: 15000.00,
        minimumBalance: 1000,
        openingDate: '2024-03-01',
        description: 'Account for small daily expenses and petty cash'
      }
    ];

    const insertAccount = db.prepare(`
      INSERT INTO bank_accounts (
        account_name, account_number, ifsc_code, bank_name, branch_name,
        account_type, current_balance, available_balance, minimum_balance,
        interest_rate, is_default, opening_date, description, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const account of accounts) {
      insertAccount.run(
        account.accountName,
        account.accountNumber,
        account.ifscCode,
        account.bankName,
        account.branchName,
        account.accountType,
        account.currentBalance,
        account.availableBalance,
        account.minimumBalance,
        account.interestRate || 0,
        account.isDefault || 0,
        account.openingDate,
        account.description,
        1 // Created by admin user
      );
    }
    console.log('✅ Sample bank accounts created');

    // Create sample transactions for demonstration
    console.log('🔄 Creating sample bank transactions...');
    
    const transactions = [
      {
        accountId: 1,
        transactionId: 'TXN001',
        transactionType: 'credit',
        transactionMode: 'upi',
        amount: 15000,
        balanceAfter: 125000.50,
        description: 'Payment received from customer - Invoice #INV001',
        referenceNumber: 'UPI123456789',
        category: 'business',
        transactionDate: '2025-07-23'
      },
      {
        accountId: 1,
        transactionId: 'TXN002',
        transactionType: 'debit',
        transactionMode: 'online',
        amount: 5000,
        balanceAfter: 120000.50,
        description: 'Rent payment for office space',
        beneficiaryName: 'Property Owner',
        beneficiaryAccount: 'RENT123456',
        category: 'business',
        transactionDate: '2025-07-22'
      },
      {
        accountId: 2,
        transactionId: 'TXN003',
        transactionType: 'credit',
        transactionMode: 'neft',
        amount: 25000,
        balanceAfter: 85000.75,
        description: 'Transfer from current account for savings',
        transferAccountId: 1,
        category: 'business',
        transactionDate: '2025-07-21'
      }
    ];

    const insertTransaction = db.prepare(`
      INSERT INTO bank_transactions (
        account_id, transaction_id, transaction_type, transaction_mode, amount,
        balance_after, description, reference_number, beneficiary_name,
        beneficiary_account, transfer_account_id, category, transaction_date, processed_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const txn of transactions) {
      insertTransaction.run(
        txn.accountId,
        txn.transactionId,
        txn.transactionType,
        txn.transactionMode,
        txn.amount,
        txn.balanceAfter,
        txn.description,
        txn.referenceNumber || null,
        txn.beneficiaryName || null,
        txn.beneficiaryAccount || null,
        txn.transferAccountId || null,
        txn.category,
        txn.transactionDate,
        1 // Processed by admin user
      );
    }
    console.log('✅ Sample bank transactions created');
  }

  console.log('🎉 Bank accounts system successfully created!');
  console.log('📊 Summary:');
  
  const accountCount = db.prepare('SELECT COUNT(*) as count FROM bank_accounts').get() as { count: number };
  const transactionCount = db.prepare('SELECT COUNT(*) as count FROM bank_transactions').get() as { count: number };
  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM bank_account_categories').get() as { count: number };
  
  console.log(`   - Bank Accounts: ${accountCount.count}`);
  console.log(`   - Transactions: ${transactionCount.count}`);
  console.log(`   - Categories: ${categoryCount.count}`);

} catch (error) {
  console.error('❌ Error creating bank accounts tables:', error);
} finally {
  db.close();
}