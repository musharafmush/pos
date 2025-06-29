import { sqlite } from './db/index.js';

async function checkDashboardData() {
  try {
    console.log('🔍 Checking dashboard data...');

    // Check total sales
    const totalSales = sqlite.prepare('SELECT COUNT(*) as count, SUM(CAST(total AS REAL)) as revenue FROM sales').get();
    console.log('📊 Total sales:', totalSales);

    // Check today's sales (using different date formats)
    const todayISO = new Date().toISOString().split('T')[0];
    const todaySalesISO = sqlite.prepare(`
      SELECT COUNT(*) as count, SUM(CAST(total AS REAL)) as revenue 
      FROM sales 
      WHERE DATE(created_at) = ?
    `).get(todayISO);
    console.log('📅 Today sales (ISO):', todaySalesISO);

    // Check recent sales
    const recentSales = sqlite.prepare(`
      SELECT created_at, total, DATE(created_at) as sale_date
      FROM sales 
      ORDER BY created_at DESC 
      LIMIT 10
    `).all();
    console.log('📋 Recent sales:', recentSales);

    // Check what dates we have sales for
    const salesDates = sqlite.prepare(`
      SELECT DATE(created_at) as sale_date, COUNT(*) as count, SUM(CAST(total AS REAL)) as revenue
      FROM sales 
      GROUP BY DATE(created_at)
      ORDER BY sale_date DESC
      LIMIT 10
    `).all();
    console.log('📆 Sales by date:', salesDates);

    // Update some recent sales to today's date for testing
    const today = new Date().toISOString();
    const updateQuery = sqlite.prepare(`
      UPDATE sales 
      SET created_at = ?
      WHERE id IN (SELECT id FROM sales ORDER BY created_at DESC LIMIT 3)
    `);
    
    const result = updateQuery.run(today);
    console.log('✅ Updated recent sales to today:', result.changes);

    // Check again after update
    const todaySalesAfter = sqlite.prepare(`
      SELECT COUNT(*) as count, SUM(CAST(total AS REAL)) as revenue 
      FROM sales 
      WHERE DATE(created_at) = DATE('now')
    `).get();
    console.log('📅 Today sales after update:', todaySalesAfter);

  } catch (error) {
    console.error('❌ Error checking dashboard data:', error);
  }
}

checkDashboardData();