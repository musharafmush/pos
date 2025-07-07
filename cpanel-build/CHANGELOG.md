
# Changelog

## [Unreleased]

### Fixed
- **Deployment Data Persistence Issue Resolved** - Fixed data loss during redeployment
  - Added automatic database initialization on server startup
  - Created comprehensive database schema setup with all required tables
  - Added data backup and restore utilities for data protection
  - Implemented admin routes for database management
  - Fixed missing `sales_items.subtotal` column error
  - Added default admin user, categories, and suppliers creation

- **Vite Dev Server Refresh Issue Resolved** - Fixed unwanted page refreshes during development
  - Set `server.host` to `0.0.0.0` for Replit compatibility
  - Configured proper `server.port` to avoid conflicts
  - Fixed HMR (Hot Module Replacement) WebSocket disconnections
  - Improved error handling in `main.tsx` for better stability
  - Enhanced development experience with stable live-reload environment

