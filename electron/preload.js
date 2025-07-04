const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Navigation
  navigate: (route) => ipcRenderer.send('navigate', route),
  onNavigate: (callback) => ipcRenderer.on('navigate', callback),
  
  // Data operations
  backupData: () => ipcRenderer.send('backup-data'),
  restoreData: () => ipcRenderer.send('restore-data'),
  onBackupData: (callback) => ipcRenderer.on('backup-data', callback),
  onRestoreData: (callback) => ipcRenderer.on('restore-data', callback),
  
  // About dialog
  showAbout: () => ipcRenderer.send('show-about'),
  onShowAbout: (callback) => ipcRenderer.on('show-about', callback),
  
  // Print operations
  printReceipt: (data) => ipcRenderer.send('print-receipt', data),
  printLabel: (data) => ipcRenderer.send('print-label', data),
  
  // System info
  getVersion: () => ipcRenderer.invoke('get-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
  // File operations
  selectFile: (options) => ipcRenderer.invoke('select-file', options),
  saveFile: (options) => ipcRenderer.invoke('save-file', options),
  
  // Window controls
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  
  // Updates
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});