# Awesome Shop POS System

## Overview

This is a comprehensive Point of Sale (POS) system designed for Indian retail businesses, featuring multi-language support (primarily Hindi/English), GST compliance, inventory management, and customer loyalty programs. The system operates with Indian Rupee (₹) as the default currency and includes features specific to Indian retail requirements like HSN codes, CGST/SGST/IGST calculations, and business compliance features.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Library**: Shadcn/ui components with Tailwind CSS for modern, responsive design
- **State Management**: React hooks and context for application state
- **Routing**: React Router for single-page application navigation

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Database**: SQLite for development, with MySQL support for production (cPanel hosting)
- **ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Passport.js with local strategy and bcrypt for password hashing
- **Session Management**: Express-session with secure session handling

### Database Design
- **Primary Database**: SQLite (pos-data.db) for local/development
- **Production Database**: MySQL for cPanel hosting environments
- **Schema Management**: Drizzle Kit for database migrations and schema management

## Key Components

### Core Modules
1. **User Management**: Admin/staff user roles with authentication
2. **Product Management**: Comprehensive product catalog with GST compliance
3. **Inventory Management**: Stock tracking, alerts, and adjustments
4. **Sales Management**: POS interface for transaction processing
5. **Purchase Management**: Supplier management and purchase order processing
6. **Customer Management**: Customer database with loyalty program integration
7. **Reports & Analytics**: Sales reports, inventory reports, and business insights

### GST & Tax Compliance
- HSN code management for Indian tax compliance
- CGST, SGST, IGST, and CESS rate calculations
- Tax-inclusive and tax-exclusive pricing options
- Automated tax calculations based on business location

### Customer Loyalty System
- Tier-based loyalty program (Member, Bronze, Silver, Gold)
- Points accumulation and redemption
- Customer purchase history tracking

### Inventory Features
- Real-time stock tracking
- Low stock alerts and thresholds
- Batch tracking and expiry date management
- Multiple unit of measure support

## Data Flow

### Sales Transaction Flow
1. **Product Selection**: Staff selects products from catalog
2. **Cart Management**: Items added to cart with quantity and pricing
3. **Tax Calculation**: Automatic GST calculation based on HSN codes
4. **Payment Processing**: Multiple payment methods (Cash, UPI, Card, Bank)
5. **Receipt Generation**: Digital receipt with tax breakdowns
6. **Inventory Update**: Automatic stock deduction
7. **Loyalty Points**: Customer points calculation and update

### Purchase Order Flow
1. **Supplier Selection**: Choose from registered suppliers
2. **Product Addition**: Add products with quantities and costs
3. **Tax Configuration**: Apply supplier-specific tax rates
4. **Order Processing**: Generate purchase orders
5. **Goods Receipt**: Record received quantities and update inventory
6. **Payment Tracking**: Monitor payment status and due amounts

## External Dependencies

### Core Dependencies
- **better-sqlite3**: SQLite database driver for local operations
- **mysql2**: MySQL driver for production hosting
- **express**: Web server framework
- **passport**: Authentication middleware
- **bcryptjs**: Password hashing
- **zod**: Schema validation
- **drizzle-orm**: Type-safe ORM

### Development Dependencies
- **vite**: Build tool and development server
- **typescript**: Type checking and compilation
- **tailwindcss**: Utility-first CSS framework
- **eslint**: Code linting and quality checks

### Indian Business Compliance
- GST calculation libraries
- HSN code database integration
- Indian currency formatting (₹)
- Local language support preparation

## Deployment Strategy

### Development Environment
- **Local Development**: SQLite database with Vite dev server
- **Port Configuration**: Default port 5000 for Replit compatibility
- **Hot Reload**: Configured for stable development experience

### Production Deployment Options

#### cPanel Hosting (Primary)
- **Build Process**: Automated build script for cPanel environments
- **Database**: MySQL with credentials configured via environment variables
- **File Structure**: Optimized for shared hosting environments
- **Apache Configuration**: .htaccess for proper routing and API handling

#### Replit Deployment
- **Auto-scaling**: Configured for Replit's autoscale deployment
- **Environment**: Node.js 20 with PostgreSQL support
- **Port Configuration**: External port 80 mapping to internal port 5000

#### Desktop Application
- **Electron Integration**: Desktop app build capabilities
- **Portable Mode**: Self-contained executable for offline use
- **Local Database**: SQLite for desktop installations

### Database Migration Strategy
- **Schema Versioning**: Comprehensive migration scripts for schema updates
- **Data Backup**: Automated backup system before deployments
- **Multi-Environment**: Support for SQLite (dev) and MySQL (prod)

## Changelog

- June 25, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.