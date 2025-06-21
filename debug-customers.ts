import Database from 'better-sqlite3';

const sqlite = new Database('./pos-data.db');

console.log('=== Customer Reports Debug ===');

// Check customers table
const customers = sqlite.prepare('SELECT * FROM customers').all();
console.log(`\nTotal customers: ${customers.length}`);
customers.forEach(customer => {
  console.log(`- ${customer.name} (ID: ${customer.id})`);
});

// Check sales table
const sales = sqlite.prepare('SELECT * FROM sales').all();
console.log(`\nTotal sales: ${sales.length}`);
sales.forEach(sale => {
  console.log(`- Sale ${sale.id}: Customer ${sale.customer_id}, Total: ${sale.total}, Date: ${sale.created_at}`);
});

// Test the updated top customers query
const topCustomersQuery = `
  SELECT 
    c.id,
    c.name,
    c.phone,
    c.email,
    COUNT(s.id) as totalOrders,
    ROUND(COALESCE(SUM(s.total), 0), 2) as totalSpent,
    ROUND(COALESCE(AVG(s.total), 0), 2) as avgOrderValue,
    MAX(s.created_at) as lastOrderDate,
    CASE 
      WHEN MAX(s.created_at) >= date('now', '-30 days') THEN 'active'
      ELSE 'inactive'
    END as status
  FROM customers c
  LEFT JOIN sales s ON c.id = s.customer_id AND s.customer_id IS NOT NULL
  GROUP BY c.id, c.name, c.phone, c.email
  ORDER BY totalSpent DESC, c.name ASC
  LIMIT 20
`;

console.log('\n=== Top Customers Query Results ===');
const topCustomers = sqlite.prepare(topCustomersQuery).all();
console.log(`Found ${topCustomers.length} top customers:`);
topCustomers.forEach(customer => {
  console.log(`- ${customer.name}: ${customer.totalOrders} orders, ₹${customer.totalSpent} spent`);
});

// Also test without the WHERE clause
const allCustomersQuery = `
  SELECT 
    c.id,
    c.name,
    c.phone,
    c.email,
    COUNT(s.id) as totalOrders,
    ROUND(COALESCE(SUM(s.total), 0), 2) as totalSpent
  FROM customers c
  LEFT JOIN sales s ON c.id = s.customer_id
  GROUP BY c.id, c.name, c.phone, c.email
  ORDER BY totalSpent DESC
`;

console.log('\n=== All Customers with Sales Data ===');
const allCustomers = sqlite.prepare(allCustomersQuery).all();
allCustomers.forEach(customer => {
  console.log(`- ${customer.name}: ${customer.totalOrders} orders, ₹${customer.totalSpent} spent`);
});

sqlite.close();