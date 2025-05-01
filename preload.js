const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  getMemoryUsage: () => ipcRenderer.invoke('get-memory-usage'),
  getCpuUsage: () => ipcRenderer.invoke('get-cpu-usage'),
  getDiskUsage: () => ipcRenderer.invoke('get-disk-usage'),
  getNetworkInfo: () => ipcRenderer.invoke('get-network-info'),
  
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  getPackages: () => ipcRenderer.invoke('get-packages'),
  packageAction: (action, packageId) => ipcRenderer.invoke('package-action', action, packageId),
  installPackages: (packageIds) => ipcRenderer.invoke('install-packages', packageIds),
  getCurrentTweaks: () => ipcRenderer.invoke('get-current-tweaks'),
  applyTweaks: (tweaks) => ipcRenderer.invoke('apply-tweaks', tweaks),
  optimizeRam: () => ipcRenderer.invoke('optimizeRam'),
  setGameMode: (enabled) => ipcRenderer.invoke('setGameMode', enabled),
  getGameModeStatus: () => ipcRenderer.invoke('getGameModeStatus'),
  setPowerPlan: (plan) => ipcRenderer.invoke('setPowerPlan', plan),
  setFpsCounter: (enabled) => ipcRenderer.invoke('setFpsCounter', enabled),
  launchSystemTool: (toolName) => ipcRenderer.invoke('launch-system-tool', toolName),
  setAlwaysOnTop: (value) => ipcRenderer.invoke('setAlwaysOnTop', value),
  getAlwaysOnTop: () => ipcRenderer.invoke('getAlwaysOnTop'),
  optimizeMemory: () => ipcRenderer.invoke('optimizeMemory'),
  optimizeNetwork: () => ipcRenderer.invoke('optimizeNetwork'),
  cleanupSystem: () => ipcRenderer.invoke('cleanupSystem'),
  launchPerformanceMonitor: () => ipcRenderer.invoke('launchPerformanceMonitor'),
  activateGameBooster: () => ipcRenderer.invoke('activateGameBooster'),
  deactivateGameBooster: () => ipcRenderer.invoke('deactivateGameBooster'),
  reloadWindow: () => ipcRenderer.send('reload-window'),
});

contextBridge.exposeInMainWorld('wintoolAPI', {
  launchSystemTool: (toolId) => ipcRenderer.invoke('launch-system-tool', toolId)
});

contextBridge.exposeInMainWorld('networkingAPI', {
  getNetworkStatus: () => ipcRenderer.invoke('get-network-status'),
});

// Add undoGameBooster API for renderer
contextBridge.exposeInMainWorld('wintoolAPI', {
  ...window.wintoolAPI,
  undoGameBooster: () => ipcRenderer.invoke('undoGameBooster')
});
