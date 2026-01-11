const { contextBridge, ipcRenderer } = require('electron')

// Expose window controls and appearance settings to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),

  // Appearance settings
  setVibrancy: (type) => ipcRenderer.invoke('set-vibrancy', type),
  setOpacity: (opacity) => ipcRenderer.invoke('set-opacity', opacity),
  setBlur: (blur) => ipcRenderer.invoke('set-blur', blur),
  getAppearanceSettings: () => ipcRenderer.invoke('get-appearance-settings'),
  reloadCSS: () => ipcRenderer.invoke('reload-css'),

  // Platform info
  platform: process.platform,
  isElectron: true
})
