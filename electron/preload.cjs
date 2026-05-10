const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  platform: process.platform,
  isElectron: true,

  // Navigation from tray menu
  onNavigate: (callback) => {
    ipcRenderer.on('navigate', (_event, path) => callback(path));
  },

  // App version
  getVersion: () => ipcRenderer.invoke('get-version'),
});
