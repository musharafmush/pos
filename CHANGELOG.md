
# Changelog

## [Unreleased]

### Fixed
- **Vite Dev Server Refresh Issue Resolved** - Fixed unwanted page refreshes during development
  - Set `server.host` to `0.0.0.0` for Replit compatibility
  - Configured proper `server.port` to avoid conflicts
  - Fixed HMR (Hot Module Replacement) WebSocket disconnections
  - Improved error handling in `main.tsx` for better stability
  - Enhanced development experience with stable live-reload environment

