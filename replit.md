# Awesome Shop POS - Point of Sale System

## Overview

Awesome Shop POS is a comprehensive Point of Sale system designed specifically for Indian retail businesses. Built with modern web technologies, it provides a complete solution for inventory management, sales processing, purchase management, customer management, and GST compliance.

The system uses a hybrid architecture that can run as both a web application and a desktop app using Electron, with support for both SQLite (development/local) and MySQL (production/cPanel) databases.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS for utility-first styling
- **State Management**: React Query for server state management
- **Routing**: React Router for client-side navigation

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Passport.js with local strategy and bcrypt for password hashing
- **Session Management**: Express sessions with SQLite/MySQL storage
- **API Design**: RESTful API endpoints with JSON responses

### Database Architecture
- **Development**: SQLite for local development and desktop app deployment
- **Production**: MySQL for cPanel hosting environments
- **Schema Management**: Drizzle Kit for database migrations and schema evolution
- **Data Storage**: Single database with normalized tables for all business entities

## Key Components

### Core Business Modules
1. **Product Management**: Complete inventory tracking with categories, suppliers, pricing, and stock levels
2. **Sales Management**: POS interface with barcode scanning, customer management, and receipt generation
3. **Purchase Management**: Purchase order creation, supplier management, and inventory receiving
4. **Customer Management**: Customer profiles, loyalty programs, and transaction history
5. **User Management**: Role-based access control with admin and cashier roles

### Indian Business Compliance
- **GST Integration**: Complete GST calculation with CGST, SGST, IGST, and CESS support
- **HSN Code Management**: Product classification for tax compliance
- **Currency Support**: Indian Rupee (₹) as default currency with proper formatting
- **Tax Reporting**: GST-compliant invoice generation and tax reports

### Advanced Features
- **Barcode Support**: Product identification and quick scanning
- **Loyalty Program**: Points-based customer rewards system
- **Inventory Alerts**: Low stock notifications and reorder management
- **Cash Register**: Complete cash management with opening/closing procedures
- **Reports**: Sales, purchase, and inventory reports with date filtering

## Data Flow

### Sales Process Flow
1. Cashier logs into the system
2. Customer products are scanned or manually selected
3. System calculates prices, taxes, and discounts
4. Payment is processed (cash, card, UPI, etc.)
5. Receipt is generated and inventory is automatically updated
6. Transaction is recorded for reporting and analytics

### Purchase Process Flow
1. Purchase order is created with supplier information
2. Products are added with quantities, costs, and tax details
3. Order is submitted and tracked until delivery
4. Received items update inventory levels automatically
5. Purchase costs are recorded for margin calculations

### Inventory Management Flow
- Real-time stock level tracking
- Automatic reorder point alerts
- Batch and expiry date management
- Serial number tracking for applicable products
- Inventory adjustments and transfers

## External Dependencies

### Runtime Dependencies
- **express**: Web server framework
- **better-sqlite3**: SQLite database driver for local development
- **mysql2**: MySQL database driver for production deployment
- **drizzle-orm**: Type-safe ORM for database operations
- **bcryptjs**: Password hashing for user authentication
- **passport**: Authentication middleware
- **react**: Frontend framework
- **@tanstack/react-query**: Server state management

### Development Dependencies
- **vite**: Build tool and development server
- **typescript**: Type safety and enhanced development experience
- **tailwindcss**: Utility-first CSS framework
- **drizzle-kit**: Database schema management and migrations
- **electron**: Desktop app packaging (optional)

### Business Dependencies
- Supports Indian GST tax calculations
- Compatible with barcode scanners and receipt printers
- Designed for cPanel shared hosting environments
- Optimized for small to medium retail businesses

## Deployment Strategy

### Local/Desktop Deployment
- SQLite database for data storage
- Electron wrapper for desktop app experience
- Single executable with all dependencies bundled
- Suitable for single-store operations

### Web/Cloud Deployment
- MySQL database for multi-user access
- Express server deployed on cPanel or similar hosting
- Static frontend assets served by web server
- Suitable for multi-location businesses

### Development Environment
- Vite dev server with hot reload
- SQLite database for rapid development
- Accessible on localhost:5000
- Automatic database initialization with sample data

### Production Build Process
1. Frontend assets are built using Vite
2. TypeScript server code is compiled to JavaScript
3. Database migrations are applied automatically
4. Static assets and server code are deployed together
5. Environment variables configure database connections

## Changelog
- June 25, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.