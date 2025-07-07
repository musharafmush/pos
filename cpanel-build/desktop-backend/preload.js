/**
 * Awesome Shop POS - Desktop Preload Script
 * Secure bridge between Electron main process and renderer
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Desktop-specific API functions
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  getDatabaseStats: () => ipcRenderer.invoke('get-database-stats'),
  createBackup: () => ipcRenderer.invoke('create-backup'),
  exportData: (format) => ipcRenderer.invoke('export-data', format),
  
  // Navigation functions
  navigateTo: (route) => ipcRenderer.send('navigate-to', route),
  
  // Window controls
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  
  // Application controls
  restartApp: () => ipcRenderer.send('restart-app'),
  quitApp: () => ipcRenderer.send('quit-app'),
  
  // Printer functions
  printReceipt: (data) => ipcRenderer.invoke('print-receipt', data),
  printLabel: (data) => ipcRenderer.invoke('print-label', data),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  
  // File operations
  selectFile: (options) => ipcRenderer.invoke('select-file', options),
  selectDirectory: (options) => ipcRenderer.invoke('select-directory', options),
  saveFile: (options) => ipcRenderer.invoke('save-file', options),
  
  // Notifications
  showNotification: (title, body) => ipcRenderer.send('show-notification', { title, body }),
  
  // Desktop environment info
  isDesktopApp: true,
  platform: process.platform,
  version: process.versions.electron
});

// Additional security: Remove any global Node.js APIs
delete window.require;
delete window.exports;
delete window.module;

console.log('🔒 Desktop preload script loaded - Secure communication bridge active');