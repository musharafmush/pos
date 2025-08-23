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

### Replit Agent to Replit Migration Complete (August 19, 2025)
- Successfully migrated comprehensive POS system from Replit Agent to standard Replit environment
- Fixed import path issues in server/index.ts for proper database initialization
- Database initialization working correctly with SQLite backend and proper table creation
- Express server running cleanly on port 5000 with proper middleware configuration
- All existing functionality preserved: authentication, database operations, inventory management, sales processing
- Application now runs cleanly in Replit environment with proper client/server separation
- Comprehensive POS system fully operational with all 75+ pages and features intact
- **Bill Payment Management Section Removal Complete (August 20, 2025)**: Successfully removed the entire Bill Payment Management section from purchase-entry-professional interface as requested
- Cleaned up over 1000 lines of corrupted Bill Payment Dialog code that was causing JSX syntax errors
- Fixed all 7 remaining references to `setShowBillPayment` by updating them to use Payment Management menu or show appropriate disabled messages
- Reduced file size from 6064 lines to 4565 lines through systematic cleanup of broken payment dialog fragments
- Payment Management menu remains as the primary payment interface for users with status overview functionality
- All JSX syntax errors resolved and server running successfully with no LSP diagnostics errors
- **Comprehensive Record Payment Feature Development (August 20, 2025)**: Developed professional Record Payment functionality in purchase-entry-professional interface
- Created dedicated Record Payment dialog with form validation, payment method selection, and amount processing
- Implemented multiple access points: dedicated Record Payment button and Payment Management menu integration
- Added quick payment options (Full Balance, 50% advance) with real-time outstanding balance calculations
- Enhanced with payment method options (Cash, Bank Transfer, UPI, Cheque, Credit/Debit Card), reference numbers, and payment notes
- Integrated with existing purchase order system for payment tracking and status synchronization
- Added Record Payment button directly to Purchase Summary section for immediate access from Financial Summary area
- Enhanced Record Payment dialog with comprehensive purchase order details, financial breakdown, and payment status overview
- Implemented real-time payment validation with new balance calculations and detailed amount preview
- Added multiple quick payment options (Full Balance, 50%, 25%, Clear) with enhanced styling and user feedback
- **Enhanced Purchase Summary Payment Records (August 20, 2025)**: Added comprehensive Payment Record Details section with payment information and financial breakdown
- Implemented detailed payment status tracking with visual progress indicators and professional Indian date formatting
- Complete integration of payment records display with existing Record Payment functionality for full payment lifecycle management
- **Complete GST Display Controls Implementation (August 23, 2025)**: Successfully added professional GST display controls to printer settings
- Created "Show GST Information" and "Show GST Breakdown (CGST/SGST)" toggles in Receipt Layout & Content section
- Implemented full backend and frontend integration with PostgreSQL database persistence and auto-save functionality
- GST toggles now provide complete control over tax information display on receipts for Indian business compliance
- **Fixed Purchase Dashboard Payment Status Issues (August 19, 2025)**: Resolved critical field mapping issues between backend API responses (camelCase) and frontend expectations
- Corrected Payment Due and Pending Orders calculations using proper `paymentStatus` and `paidAmount` field names
- Fixed purchase status filtering logic to properly identify partial payments and pending orders
- Enhanced debugging capabilities for payment status tracking and validation
- **Fixed Print Order Functionality**: Implemented professional purchase order printing with GST-compliant template
- Created Bill of Supply template matching Indian business standards with HSN codes, supplier details, and amount in words
- Enhanced print layout with proper formatting for thermal and A4 printing
- **Fixed Payment Date Display Issue (August 13, 2025)**: Resolved field mapping between database snake_case (`payment_date`) and frontend camelCase expectations
- Payment status now correctly displays "Fully paid on Aug 13" instead of "N/A"
- Improved TypeScript error handling with proper type casting for database field access
- **Implemented Comprehensive HSN Management System (August 4, 2025)**: Built bidirectional HSN codes sync between Add Item → Tax Information and Settings → Tax Settings sections
- Created HSNSelector component with autocomplete search and auto-assignment of GST rates
- Integrated HSNManagement component in Settings with full CRUD operations for HSN codes
- Established shared hsn_codes database table with proper schema for cross-section functionality
- Added manual HSN entry support with database save prompts and professional user interface
- System ready for deployment with complete HSN management and stable performance