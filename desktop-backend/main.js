#!/usr/bin/env node

/**
 * Awesome Shop POS - Desktop Backend Service
 * Professional desktop application backend for Indian retail businesses
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import sqlite3 from 'better-sqlite3';
import electron from 'electron';
const { app: electronApp, BrowserWindow, Menu, ipcMain, dialog, shell } = electron;
import { fileURLToPath } from 'url';
import { dirname } from 'path';

class DesktopBackendService {
  constructor() {
    this.app = express();
    this.port = 5001; // Different port for desktop backend
    this.isDev = process.env.NODE_ENV === 'development';
    this.dbPath = path.join(__dirname, '../pos-data.db');
    this.server = null;
    this.mainWindow = null;
    
    console.log('🚀 Initializing Awesome Shop POS Desktop Backend...');
    console.log('💰 Professional Indian Rupee POS System Starting...');
  }

  async initializeDatabase() {
    try {
      console.log('🔧 Setting up SQLite database for desktop mode...');
      
      // Ensure database directory exists
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Initialize SQLite connection
      this.db = new sqlite3(this.dbPath);
      
      // Enable foreign keys and WAL mode for better performance
      this.db.pragma('foreign_keys = ON');
      this.db.pragma('journal_mode = WAL');
      
      console.log('✅ Database ready for offline desktop use!');
      return true;
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      return false;
    }
  }

  setupExpressServer() {
    // Middleware
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    
    // CORS for desktop app
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      next();
    });

    // Desktop-specific API routes
    this.setupDesktopRoutes();

    // Health check endpoint
    this.app.get('/api/desktop/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        database: this.db ? 'connected' : 'disconnected',
        mode: 'desktop'
      });
    });

    // Start server
    this.server = this.app.listen(this.port, '127.0.0.1', () => {
      console.log(`🌐 Desktop backend server running on http://127.0.0.1:${this.port}`);
      console.log('📊 POS System ready for desktop use!');
    });
  }

  setupDesktopRoutes() {
    // Desktop-specific database operations
    this.app.get('/api/desktop/backup', async (req, res) => {
      try {
        const backupPath = path.join(__dirname, '../backups', `pos-backup-${Date.now()}.db`);
        const backupDir = path.dirname(backupPath);
        
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        
        // Create database backup
        fs.copyFileSync(this.dbPath, backupPath);
        
        res.json({
          success: true,
          message: 'Database backup created successfully',
          backupPath: backupPath,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to create backup',
          details: error.message
        });
      }
    });

    // System information endpoint
    this.app.get('/api/desktop/system-info', (req, res) => {
      res.json({
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        electronVersion: process.versions.electron,
        chromeVersion: process.versions.chrome,
        v8Version: process.versions.v8,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      });
    });

    // Database statistics
    this.app.get('/api/desktop/db-stats', (req, res) => {
      try {
        const stats = {
          size: fs.statSync(this.dbPath).size,
          tables: this.getTableCounts(),
          lastModified: fs.statSync(this.dbPath).mtime,
          path: this.dbPath
        };
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Export data endpoint
    this.app.get('/api/desktop/export/:format', async (req, res) => {
      const format = req.params.format;
      try {
        let exportData;
        
        switch (format) {
          case 'json':
            exportData = await this.exportToJSON();
            break;
          case 'csv':
            exportData = await this.exportToCSV();
            break;
          default:
            return res.status(400).json({ error: 'Unsupported format' });
        }
        
        res.json({
          success: true,
          data: exportData,
          format: format,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  getTableCounts() {
    const tables = ['products', 'customers', 'suppliers', 'sales', 'purchases', 'users'];
    const counts = {};
    
    tables.forEach(table => {
      try {
        const result = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
        counts[table] = result.count;
      } catch (error) {
        counts[table] = 0; // Table might not exist
      }
    });
    
    return counts;
  }

  async exportToJSON() {
    const data = {};
    const tables = ['products', 'customers', 'suppliers', 'sales', 'purchases', 'users'];
    
    tables.forEach(table => {
      try {
        data[table] = this.db.prepare(`SELECT * FROM ${table}`).all();
      } catch (error) {
        data[table] = []; // Table might not exist
      }
    });
    
    return data;
  }

  async exportToCSV() {
    // Basic CSV export implementation
    const tables = await this.exportToJSON();
    const csvData = {};
    
    Object.keys(tables).forEach(tableName => {
      const rows = tables[tableName];
      if (rows.length > 0) {
        const headers = Object.keys(rows[0]);
        const csvRows = [headers.join(',')];
        
        rows.forEach(row => {
          const values = headers.map(header => {
            const value = row[header];
            return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
          });
          csvRows.push(values.join(','));
        });
        
        csvData[tableName] = csvRows.join('\n');
      }
    });
    
    return csvData;
  }

  async start() {
    console.log('🔄 Starting Desktop Backend Service...');
    
    // Initialize database first
    const dbReady = await this.initializeDatabase();
    if (!dbReady) {
      console.error('❌ Failed to initialize database. Exiting...');
      process.exit(1);
    }

    // Setup Express server
    this.setupExpressServer();

    // Handle server shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down desktop backend...');
      if (this.server) {
        this.server.close();
      }
      if (this.db) {
        this.db.close();
      }
      process.exit(0);
    });

    console.log('✅ Desktop Backend Service started successfully!');
    console.log('💰 Awesome Shop POS ready for professional use!');
  }
}

// Start the desktop backend service
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (import.meta.url === `file://${process.argv[1]}`) {
  const desktopBackend = new DesktopBackendService();
  desktopBackend.start().catch(error => {
    console.error('❌ Failed to start desktop backend:', error);
    process.exit(1);
  });
}

export default DesktopBackendService;