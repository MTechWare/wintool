const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  getMemoryUsage: () => ipcRenderer.invoke('get-memory-usage'),
  getCpuUsage: () => ipcRenderer.invoke('get-cpu-usage'),
  getDiskUsage: () => ipcRenderer.invoke('get-disk-usage'),
  getNetworkInfo: () => ipcRenderer.invoke('get-network-info'),
  testHardwareMonitor: () => ipcRenderer.invoke('test-hardware-monitor'),
  
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
  launchPerformanceMonitor: () => ipcRenderer.invoke('launchPerformanceMonitor'),
  activateGameBooster: () => ipcRenderer.invoke('activateGameBooster'),
  deactivateGameBooster: () => ipcRenderer.invoke('deactivateGameBooster'),
  reloadWindow: () => ipcRenderer.send('reload-window'),
  setGameBooster: (enabled) => ipcRenderer.invoke('setGameBooster', enabled),
  getGameBoosterStatus: () => ipcRenderer.invoke('getGameBoosterStatus'),
  openDeviceManager: () => ipcRenderer.invoke('open-device-manager'),
  
  // Cleanup functions
  runQuickCleanup: () => ipcRenderer.invoke('runQuickCleanup'),
  runAdvancedCleanup: (options) => ipcRenderer.invoke('runAdvancedCleanup', options),

  // Startup Apps tab functions
  getStartupItems: () => ipcRenderer.invoke('getStartupItems'),
  setStartupItemState: (itemId, enabled) => ipcRenderer.invoke('setStartupItemState', itemId, enabled),
  removeStartupItem: (itemId) => ipcRenderer.invoke('removeStartupItem', itemId),
  addStartupItem: (itemData) => ipcRenderer.invoke('addStartupItem', itemData),
  browseForFile: (options) => ipcRenderer.invoke('browseForFile', options),
  
  // Network tab functions
  getNetworkInfo: () => ipcRenderer.invoke('getNetworkInfo'),
  flushDns: () => ipcRenderer.invoke('flushDns'),
  releaseRenewIp: () => ipcRenderer.invoke('releaseRenewIp'),
  resetNetwork: () => ipcRenderer.invoke('resetNetwork'),
  openNetworkSettings: () => ipcRenderer.invoke('openNetworkSettings'),
  runPingTest: (target) => ipcRenderer.invoke('runPingTest', target),
  optimizeNetwork: (options) => ipcRenderer.invoke('optimizeNetwork', options),
  
  // Automation & Scripting tab functions
  getScheduledTasks: () => ipcRenderer.invoke('getScheduledTasks'),
  runScheduledTask: (taskName) => ipcRenderer.invoke('runScheduledTask', taskName),
  deleteScheduledTask: (taskName) => ipcRenderer.invoke('deleteScheduledTask', taskName),
  createScheduledTask: (taskData) => ipcRenderer.invoke('createScheduledTask', taskData),
  runBatchScript: (scriptContent, showOutput) => ipcRenderer.invoke('runBatchScript', scriptContent, showOutput),
  saveBatchScript: (scriptContent) => ipcRenderer.invoke('saveBatchScript', scriptContent),
  loadBatchScript: () => ipcRenderer.invoke('loadBatchScript'),
  runPowerShellScript: (scriptContent, showOutput) => ipcRenderer.invoke('runPowerShellScript', scriptContent, showOutput),
  savePowerShellScript: (scriptContent) => ipcRenderer.invoke('savePowerShellScript', scriptContent),
  loadPowerShellScript: () => ipcRenderer.invoke('loadPowerShellScript'),

  // Privacy tab functions
  getPrivacyStates: () => ipcRenderer.invoke('getPrivacyStates'),
  getSystemPrivacySettings: () => ipcRenderer.invoke('getSystemPrivacySettings'),  // Use actual system check
  setPrivacySetting: (setting, value) => ipcRenderer.invoke('setPrivacySetting', setting, value),
  setTelemetry: (enabled) => ipcRenderer.invoke('setTelemetry', enabled),
  applyPrivacyLockdown: () => ipcRenderer.invoke('applyPrivacyLockdown'),
  getPrivacyGuardStatus: () => ipcRenderer.invoke('getPrivacyGuardStatus'),
  setPrivacyGuard: (enabled) => ipcRenderer.invoke('setPrivacyGuard', enabled),

  executeCommand: async (cmd, shell) => {
    const result = await ipcRenderer.invoke('execute-command', cmd, shell);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.output;
  },

  checkAdminRights: () => ipcRenderer.invoke('check-admin-rights'),
  requestElevation: () => ipcRenderer.invoke('request-elevation'),
  isElevated: () => ipcRenderer.invoke('is-elevated'),
  restartAsAdmin: () => ipcRenderer.invoke('restart-as-admin'),
});

contextBridge.exposeInMainWorld('wintoolAPI', {
  launchSystemTool: (toolId) => ipcRenderer.invoke('launch-system-tool', toolId),
  undoGameBooster: () => ipcRenderer.invoke('undoGameBooster')
});

contextBridge.exposeInMainWorld('networkingAPI', {
  getNetworkStatus: () => ipcRenderer.invoke('get-network-status'),
});
