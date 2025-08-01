# Awesome Shop POS System

## Overview

This is a comprehensive Point of Sale (POS) system designed for Indian retail businesses. It features multi-language support (primarily Hindi/English), GST compliance, robust inventory management, and customer loyalty programs. The system operates with Indian Rupee (₹) as the default currency and includes features specific to Indian retail requirements like HSN codes, CGST/SGST/IGST calculations, and business compliance. The ambition is to provide a complete retail management solution that simplifies operations and enhances customer engagement for businesses in India.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The system utilizes React with Shadcn/ui and Tailwind CSS for a modern, responsive, and professional user interface. Design focuses on efficient workflows, compact layouts to minimize scrolling, and clear visual feedback through color-coded elements and status indicators. This includes optimizing layouts for POS operations and manufacturing workflows, ensuring a consistent and intuitive user experience across all modules. Specific attention is given to professional appearance, easy navigation, and visual clarity for complex data.

### Technical Implementations
- **Frontend**: React with TypeScript, Vite for build processes, React hooks and Context for state management, and React Router for navigation.
- **Backend**: Node.js with Express.js. Authentication is handled by Passport.js and bcrypt. Session management uses express-session.
- **Database**: Primarily SQLite for development/local use, with support for MySQL in production environments (cPanel hosting). Drizzle ORM is used for type-safe database operations, supported by Drizzle Kit for schema management and migrations.
- **Key Modules**: User Management (Admin/staff roles), Product Management (with GST compliance), Inventory Management (stock tracking, alerts, batch tracking, multi-unit support, bulk repacking, weight-based items), Sales Management (POS interface, multi-payment options, receipt generation), Purchase Management (supplier and PO processing), Customer Management (loyalty programs, purchase history), and Reports & Analytics.
- **GST & Tax Compliance**: Integrated HSN code management, automated CGST/SGST/IGST/CESS calculations, and flexible tax-inclusive/exclusive pricing.
- **Customer Loyalty System**: Tier-based program (Member, Bronze, Silver, Gold) with points accumulation and redemption.
- **Search & Filter**: Comprehensive real-time search and filtering capabilities across various dashboards (e.g., sales, repacking), with custom searchable dropdowns and advanced filtering options.
- **Financial Management**: Includes bank account deposit/withdrawal functionality, comprehensive bank account CRUD operations, and real-time balance validation.
- **Manufacturing System**: Comprehensive manufacturing management with production orders, batch tracking, quality control, raw material inventory, and recipe management. This includes a product formula creation page with ingredient management and real-time validation.
- **Label Printing**: Advanced label template system with professional barcode generation (CODE128), customizable font sizes, landscape/portrait orientation, manufacturing/expiry date inclusion, and a WYSIWYG visual designer for drag-and-drop element customization. It supports various label sizes and offers features for precise alignment and dynamic data integration.
- **Printer Settings**: Unified printer settings consolidating auto-printer and thermal printer configurations, receipt layout controls, and business information management. Supports 77mm thermal paper and dynamic configuration.
- **Deployment Strategy**: Designed for multi-environment deployment including local development, cPanel hosting (Node.js/MySQL), Replit deployments, and a professional Electron-based desktop application with an EXE installer.

## External Dependencies

- **Database Drivers**: `better-sqlite3` (for SQLite), `mysql2` (for MySQL).
- **Web Framework**: `express` (Node.js).
- **Authentication**: `passport`, `bcryptjs`.
- **Data Validation**: `zod`.
- **ORM**: `drizzle-orm`.
- **Build Tools**: `vite`, `typescript`.
- **Styling**: `tailwindcss`.
- **Code Quality**: `eslint`.
- **Barcode Generation**: `JsBarcode`.
- **Desktop Application Framework**: `electron-builder` (for Windows EXE installer).

## Recent Changes

### Replit Agent to Replit Migration Complete (August 1, 2025)
- Successfully migrated comprehensive POS system from Replit Agent to standard Replit environment
- Fixed TypeScript compatibility issues for proper compilation and LSP error resolution
- Enhanced database migration with proper type casting for SQLite query results  
- Resolved UI gap in Bill Summary section by optimizing spacing and padding throughout interface
- Database initialization working correctly with SQLite backend and proper table creation
- Express server running cleanly on port 5000 with proper middleware configuration
- All existing functionality preserved: authentication, database operations, inventory management, sales processing
- Application now runs cleanly in Replit environment with proper client/server separation
- Comprehensive POS system fully operational with all 75+ pages and features intact
- Fixed spacing issues in POS Enhanced Bill Summary for better space utilization
- Verified security practices and eliminated common vulnerabilities
- System ready for deployment with optimized user interface and stable performance