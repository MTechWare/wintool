const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  launchTaskManager: () => ipcRenderer.invoke('launch-task-manager'),
  launchDiskCleanup: () => ipcRenderer.invoke('launch-disk-cleanup'),
  getPackages: () => ipcRenderer.invoke('get-packages'),
  packageAction: (action, packageId) => ipcRenderer.invoke('package-action', action, packageId),
  getCurrentTweaks: () => ipcRenderer.invoke('get-current-tweaks'),
  applyTweaks: (tweaks) => ipcRenderer.invoke('apply-tweaks', tweaks),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  // Add more as needed (e.g., tweaks)
});
