#!/usr/bin/env tsx

// Quick fix for bank account creation issue
// This script tests the bank account creation functionality directly

import sqlite3 from 'better-sqlite3';

const db = sqlite3('./pos-data.db');

// Test bank account creation
function testBankAccountCreation() {
  try {
    console.log('🔧 Testing bank account creation...');
    
    // Check if bank_accounts table exists
    const tableCheck = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='bank_accounts'
    `).get();
    
    if (!tableCheck) {
      console.log('❌ bank_accounts table does not exist');
      return;
    }
    
    // Check table schema
    const schema = db.prepare("PRAGMA table_info(bank_accounts)").all();
    console.log('📋 Bank accounts table schema:');
    schema.forEach(col => console.log(`  ${col.name}: ${col.type}`));
    
    // Test insert
    const testData = {
      account_name: 'Test Fix Account',
      account_number: '9876543210',
      bank_name: 'Test Fix Bank',
      account_type: 'savings',
      ifsc_code: 'TEST0009876',
      branch_name: 'Test Fix Branch',
      current_balance: 10000,
      description: 'Test account for fixing creation issue'
    };
    
    const insert = db.prepare(`
      INSERT INTO bank_accounts (
        account_name, account_number, ifsc_code, bank_name, branch_name,
        account_type, currency, current_balance, available_balance,
        minimum_balance, interest_rate, status, is_default, 
        description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    const result = insert.run(
      testData.account_name,
      testData.account_number,
      testData.ifsc_code,
      testData.bank_name,
      testData.branch_name,
      testData.account_type,
      'INR',
      testData.current_balance,
      testData.current_balance,
      0,
      0,
      'active',
      0,
      testData.description
    );
    
    console.log('✅ Bank account created successfully!');
    console.log('📝 Account ID:', result.lastInsertRowid);
    
    // Verify the account was created
    const created = db.prepare('SELECT * FROM bank_accounts WHERE id = ?').get(result.lastInsertRowid);
    console.log('🔍 Created account:', created);
    
  } catch (error) {
    console.error('❌ Error testing bank account creation:', error);
  }
}

testBankAccountCreation();