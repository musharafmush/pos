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
- Advanced bulk product repacking functionality
- Weight-based item management for Ocean freight products

### Search & Filter Capabilities
- Comprehensive search functionality across repacking-professional page
- Real-time search and filtering in sales-dashboard
- Custom searchable dropdown components with keyboard navigation
- Advanced filtering by status, payment method, customer data, and order information
- Dynamic result counting and sort options

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

## Recent Changes

### Edit-Options Page Removal (June 25, 2025)
- Removed the edit-options page (POS Bill Edit) from the application
- Cleaned up App.tsx routing configuration to remove references to deleted page
- Removed POS Bill Edit references from sidebar navigation and pos-enhanced print options
- Functionality consolidated into unified printer settings and other existing pages

### Unified Printer Settings Implementation (June 25, 2025)
- Created comprehensive unified printer settings page consolidating thermal-printer-setup and auto-printer-setup
- Implemented unified interface with tabs for Auto-Printer, Thermal Printer, Receipt, Business, and Help sections
- Added Auto-Printer Status controls with activation/deactivation, print delay, retry attempts, and queue management
- Enhanced thermal printer configuration with paper width, font settings, and Xprinter XP-420B specific guidance
- Integrated receipt layout controls and business information management in single interface
- Added navigation links from main settings page to unified printer settings

### Free Qty Functionality Fix (June 25, 2025)
- Fixed Free Qty functionality in purchase-entry-professional backend processing
- Updated purchase creation API to properly handle freeQty field data
- Enhanced purchase item parsing to include all purchase fields (freeQty, receivedQty, etc.)
- Stock management now correctly adds both received quantity and free quantity to inventory
- Resolved issue where Free Qty input was not being saved to database

### Enhanced Search & Filter System (June 25, 2025)
- Implemented comprehensive search functionality for repacking-professional page
- Added advanced search and filter interface to sales-dashboard
- Created custom searchable dropdown components with keyboard navigation
- Enhanced sales data processing with real-time filtering and sorting
- Added dynamic transaction count display and collapsible filter panels

### POS Enhanced Real-Time Print (June 25, 2025)
- Implemented automatic receipt printing with real-time transaction data after sale completion
- Enhanced sale processing to capture and store complete transaction details for printing
- Added automatic print trigger 500ms after successful sale completion
- Improved data mapping to ensure accurate receipt generation with actual sale items
- Distinguished between manual test printing (sample data) and automatic real-time printing (transaction data)
- Enhanced toast notifications to indicate receipt printing status

### Print System Streamlining (June 25, 2025)
- Removed Print Receipt Options dialog to simplify printing workflow
- Implemented automatic thermal receipt printing after sale completion
- Streamlined POS printing process for improved user experience

### Receipt & Printer Settings Removal (June 27, 2025)
- Removed "Receipt & Printer Settings" button from pos-enhanced interface header
- Removed entire printer settings dialog to streamline user experience
- Simplified POS interface by removing redundant settings access points
- Direct bill printing now uses default settings for automatic thermal receipt generation

### Thermal Receipt Layout Fix (June 27, 2025)
- Fixed thermal receipt content being cut off at bottom
- Changed @page size from fixed height (150mm) to auto height to accommodate all content
- Updated page break constraints to allow natural content flow
- Enhanced spacing and padding for better thermal printer compatibility
- Improved date formatting to always show current date/time in DD/MM/YYYY format
- Optimized receipt layout to prevent content truncation on 77mm thermal paper

### Sales Dashboard Customer Details Fix (June 27, 2025)
- Fixed customer details display in sales dashboard showing "Walk-in Customer" for all sales
- Updated customer name display to properly read from nested customer object structure
- Enhanced customer data fetching to show actual customer names (Sunita Singh, Amit Patel, etc.)
- Fixed customer phone and email display in sales dashboard table
- Improved all customer references across sales dashboard components

### Thermal Receipt Customer Display Fix (June 27, 2025)
- Fixed thermal receipt showing "Walk-in Customer" instead of actual customer names
- Enhanced customer data handling in receipt generation to include customer object structure
- Added fallback logic to read customer names from multiple data sources
- Improved direct bill printing to include complete customer information
- Added debugging logs to track customer data flow through receipt generation process
- Verified fix working: thermal receipts now show actual customer names (e.g., "Anya")

### Printer Settings Debugging Enhancement (June 27, 2025)
- Added comprehensive debugging to unified printer settings save functionality
- Enhanced error handling with detailed error messages for settings save operations
- Verified receipt settings API endpoints working correctly (GET/POST)
- Added logging to track settings save process and identify any configuration issues

### Real-Time Data Integration for Printer Settings Pages (June 27, 2025)
- Implemented real-time data display across auto-printer-setup, thermal-printer-setup, and unified-printer-settings pages
- Added live data fetching with automatic refresh every 2-3 seconds using React Query
- Created dynamic status cards showing today's sales count, revenue, paper width, and auto-print status
- Enhanced all printer settings pages with live badges showing connection status, paper configuration, and data refresh indicators
- Added real-time print queue simulation based on actual sales data
- Implemented comprehensive status dashboards with color-coded indicators and icons

### Printer Settings Consolidation (June 27, 2025)
- Removed separate auto-printer-setup and thermal-printer-setup pages to eliminate redundancy
- Consolidated all printer functionality into unified-printer-settings page accessible via /printer-settings
- Updated main settings page to show only single "Printer Settings" option instead of three separate buttons
- Removed routing for /auto-printer-setup and /thermal-printer-setup from application
- Simplified printer configuration workflow by providing all settings in one comprehensive interface

### POS Enhanced Printer Integration (June 27, 2025)
- Connected POS enhanced bill printing to unified printer settings for dynamic configuration
- Added real-time printer settings query to fetch current settings from /printer-settings page
- Updated print function to use dynamic settings instead of hardcoded values for paper width, fonts, business info
- Added "Printer Settings" button in POS enhanced header for easy access to configuration
- Enhanced bill printing with automatic paper width detection (58mm, 72mm, 77mm, 80mm) from settings
- Integrated all receipt customization options from unified printer settings into POS printing workflow

### Dynamic MRP Display Fix (June 27, 2025)
- Fixed thermal receipt MRP display to use actual product MRP data instead of calculated fallback values
- Updated thermal receipt generation to show real MRP and calculate accurate savings dynamically
- Enhanced MRP formatting in print-receipt.tsx to respect showMRP setting from printer configuration
- Removed hardcoded MRP calculations (price + 20) and replaced with authentic product MRP data
- Improved receipt accuracy by displaying actual product pricing information from database
- Fixed sale data mapping to include MRP field from cart items to receipt generation
- Enhanced MRP display logic to show information in all scenarios:
  - Below MRP: "MRP: ₹15 | Save: ₹3" 
  - Above MRP: "MRP: ₹11 | Above MRP: ₹2"
  - Equal to MRP: "MRP: ₹13"

### 77mm Thermal Paper Support (June 25, 2025)
- Added support for 77mm thermal paper width in print-receipt component
- Updated paper configuration options to include 72mm, 77mm (optimal), and 80mm
- Set 77mm as the default paper width for optimal thermal printing
- Enhanced unified printer settings with comprehensive paper width options
- Updated Xprinter XP-420B configuration guidance for 77mm paper

### Label Template Size Enhancement (June 30, 2025)
- Upgraded label templates to much larger, professional sizes for real-world use
- Created 5 new large-format templates:
  - Large Product Label (150×100mm, 22pt) - Professional retail labeling
  - Medium Retail Label (120×80mm, 20pt) - Standard commercial use
  - Wide Shelf Label (200×60mm, 18pt) - Extended shelf displays
  - Tall Product Tag (80×120mm, 18pt) - Vertical hanging tags
  - Extra Large Sheet (210×297mm, 24pt) - Full A4 detailed labels
- Enhanced template display with visual size representations and layout previews
- Added orientation indicators and improved template selection interface
- Fixed database connection issues preventing template system functionality
- Resolved ES modules import problems causing "require is not defined" errors

### Label Printing Font Size Enhancement (June 30, 2025)
- Significantly increased font sizes for better readability on printed labels
- Standard Product Label: Enhanced from 12pt to 22pt font for optimal clarity
- Medium labels: Improved to 20pt font for professional appearance
- Updated default template creation to use larger fonts across all templates
- Enhanced template form reset to ensure all new templates use larger fonts

### Landscape and Portrait Orientation Menu Options (June 30, 2025)
- Added comprehensive landscape and portrait orientation selection with visual icons
- Implemented visual orientation selector with large clickable buttons showing layout previews
- Enhanced orientation descriptions with context-aware explanations for optimal use cases
- Created new orientation-specific templates supporting both layout types
- Added smart layout recommendations: Portrait for product tags, Landscape for shelf labels
- Integrated orientation flexibility across entire label printing system

### Edit Template Functionality Fix (June 30, 2025)
- Fixed critical Edit Template dialog form binding issues preventing proper template editing
- Updated all Select components to use 'value' instead of 'defaultValue' for proper form state binding
- Added orientation field to template editing interface with landscape/portrait options
- Enhanced form validation with proper placeholder text and error handling
- Fixed template form reset functionality to properly load existing template values when editing
- Improved template interface to include orientation property for comprehensive template management
- Template editing now correctly displays and allows modification of all template properties
- Resolved conflicting useEffect and form reset logic causing update failures
- Enhanced error handling with proper API response parsing and user feedback
- Fixed form state management to ensure template values load correctly when editing

### Dynamic Font Size Enhancement (June 30, 2025)
- Fixed font size input field to work dynamically during template creation and editing
- Added range slider control for intuitive font size adjustment (6pt to 72pt)
- Enhanced font preview with real-time visual feedback showing actual label content
- Improved UX with combined numeric input, slider, and current value display
- Added realistic preview showing "SUGAR BULK" product data with dynamic scaling
- Font size changes now reflect immediately in both form preview and saved templates

### Database Connection Fix (June 30, 2025)
- Fixed critical backend issue where label templates API was serving mock data instead of database records
- Connected all label template CRUD operations (Create, Read, Update, Delete) to actual SQLite database
- Resolved font size display inconsistency where edit dialog showed correct values but template cards showed outdated mock data
- Template edits now persist correctly and display actual font sizes across all interfaces
- Enhanced data integrity by ensuring all template operations work with authentic database records

### Real-Time Font Size Controls (June 30, 2025)
- Fixed font size input field to respond immediately to user changes during template editing
- Enhanced font size controls with dual input methods: number input and gradient range slider
- Added real-time visual preview showing actual label content with dynamic font scaling
- Implemented proper validation ensuring font sizes stay within 6pt-72pt bounds
- Enhanced UI with professional blue gradient styling and live value indicators
- Font size changes now update instantly without delays or form submission requirements

### SQLite Authentication Fix (June 28, 2025)
- Fixed critical SQLite user creation error caused by PostgreSQL-specific functions
- Created SQLite-compatible schema to replace PostgreSQL defaultNow() functions
- Updated database initialization to use proper SQLite timestamp handling
- Fixed password hashing system preventing double-hashing in user updates
- Added password reset API endpoint for fixing authentication issues
- Resolved login failures for all users including admin and mushu accounts
- System now properly supports user authentication with SQLite backend

### Dashboard Statistics Fix (June 28, 2025)
- Fixed critical SQLite database schema compatibility issues preventing dashboard data display
- Resolved "no such column: model" and "min_order_qty" errors in products table
- Added missing database columns (model, size, color, material, min_order_qty, etc.) to products table
- Replaced Drizzle ORM queries with direct SQLite queries in getDashboardStats function
- Fixed SQLite binding errors preventing data retrieval from sales, purchases, expenses, and returns
- Updated frontend dashboard to correctly display real financial data instead of zeros
- Dashboard now shows actual daily statistics: sales revenue, purchase amounts, expenses, returns, and net profit
- Low-stock products API endpoint restored to full functionality

## Changelog

- June 25, 2025. Initial setup and enhanced search capabilities
- June 28, 2025. Fixed SQLite authentication system, user login functionality, and dashboard statistics display

## User Preferences

Preferred communication style: Simple, everyday language.