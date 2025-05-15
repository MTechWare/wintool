/**
 * WinTool - Preload Script
 *
 * This file exposes Electron APIs to the renderer process
 * through the contextBridge, allowing secure communication
 * between the renderer and main processes.
 */

const { contextBridge, ipcRenderer } = require('electron');

// General error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);

  // All dependencies are now bundled, so we don't need specific handling for ffmpeg.dll
});

contextBridge.exposeInMainWorld('electronAPI', {
  // Dependency management
  checkDependencies: () => ipcRenderer.invoke('check-dependencies'),
  fixDependency: (dependency) => ipcRenderer.invoke('fix-dependency', dependency),
  // System resource mode
  isLowResourceMode: () => ipcRenderer.invoke('isLowResourceMode'),

  // System info functions
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  getMemoryUsage: () => ipcRenderer.invoke('get-memory-usage'),
  getCpuUsage: () => ipcRenderer.invoke('get-cpu-usage'),
  getDiskUsage: () => ipcRenderer.invoke('get-disk-usage'),
  getNetworkInfo: () => ipcRenderer.invoke('get-network-info'),

  // Additional aliases with underscores for consistency
  get_memory_usage: () => ipcRenderer.invoke('get-memory-usage'),
  get_disk_usage: () => ipcRenderer.invoke('get-disk-usage'),
  get_network_info: () => ipcRenderer.invoke('get-network-info'),

  // Hardware monitor functions
  getCpuInfo: () => ipcRenderer.invoke('get-cpu-info'),
  getGpuInfo: () => ipcRenderer.invoke('get-gpu-info'),
  getHardwareInfo: () => ipcRenderer.invoke('get-hardware-info'),
  getTemperatureData: () => ipcRenderer.invoke('get-temperature-data'),
  testHardwareMonitor: () => ipcRenderer.invoke('test-hardware-monitor'),
  openHardwareMonitor: () => ipcRenderer.invoke('open-hardware-monitor'),



  // Window control functions - these work for any window
  minimizeWindow: () => ipcRenderer.invoke('minimizeWindow'),
  maximizeWindow: () => ipcRenderer.invoke('maximizeWindow'),
  closeWindow: () => ipcRenderer.invoke('closeWindow'),

  // Tray-related functions
  minimizeToTray: () => ipcRenderer.invoke('minimizeToTray'),
  restoreFromTray: () => ipcRenderer.invoke('restoreFromTray'),
  quitApp: () => ipcRenderer.invoke('quitApp'),

  // Main window control functions (for backward compatibility)
  minimizeMainWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeMainWindow: () => ipcRenderer.invoke('maximize-window'),
  closeMainWindow: () => ipcRenderer.invoke('close-window'),

  // Tab navigation
  onNavigateToTab: (callback) => {
    ipcRenderer.on('navigate-to-tab', (_, tabName) => callback(tabName));
  },


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
  // toggleConsole has been replaced by openLogViewer
  optimizeNetwork: (options) => ipcRenderer.invoke('optimizeNetwork', options),
  launchPerformanceMonitor: () => ipcRenderer.invoke('launchPerformanceMonitor'),
  activateGameBooster: () => ipcRenderer.invoke('activateGameBooster'),
  deactivateGameBooster: () => ipcRenderer.invoke('deactivateGameBooster'),
  reloadWindow: () => ipcRenderer.send('reload-window'),
  restartApp: () => ipcRenderer.send('restart-app'),
  setGameBooster: (enabled) => ipcRenderer.invoke('setGameBooster', enabled),
  getGameBoosterStatus: () => ipcRenderer.invoke('getGameBoosterStatus'),
  openDeviceManager: () => ipcRenderer.invoke('open-device-manager'),

  // Cleanup functions
  runQuickCleanup: () => ipcRenderer.invoke('runQuickCleanup'),
  runAdvancedCleanup: (options) => ipcRenderer.invoke('runAdvancedCleanup', options),
  getDiskUsage: () => ipcRenderer.invoke('getDiskUsage'),
  findLargeFiles: (options) => ipcRenderer.invoke('findLargeFiles', options),
  getDiskUsageByFolder: (options) => ipcRenderer.invoke('getDiskUsageByFolder', options),


  browseForFile: (options) => ipcRenderer.invoke('browseForFile', options),
  saveFileDialog: (options) => ipcRenderer.invoke('saveFileDialog', options),

  // Drivers tab functions removed

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

  // Privacy tab functions removed



  executeCommand: async (cmd, shell) => {
    try {
      const result = await ipcRenderer.invoke('execute-command', cmd, shell);
      if (!result.success) {
        throw new Error(result.error || 'Unknown error');
      }
      return result.output;
    } catch (error) {
      console.error('Error executing command:', error);
      throw error;
    }
  },

  // Admin-related functions
  isElevated: () => ipcRenderer.invoke('is-elevated'),
  restartAsAdmin: () => ipcRenderer.invoke('restart-as-admin'),
  setElevationPreference: (shouldElevate, resetOnly = false) => ipcRenderer.invoke('set-elevation-preference', shouldElevate, resetOnly),

  // Logging functions
  getFilteredLogs: (filters) => ipcRenderer.invoke('getFilteredLogs', filters),
  exportLogs: (filters) => ipcRenderer.invoke('exportLogs', filters),
  logUserAction: (action, details) => ipcRenderer.invoke('logUserAction', action, details),
  openLogViewer: () => ipcRenderer.invoke('openLogViewer'),

  // Backup and restore functions
  createBackup: (backupPath, options) => ipcRenderer.invoke('createBackup', backupPath, options),
  restoreBackup: (backupFile, options) => ipcRenderer.invoke('restoreBackup', backupFile, options),
  getBackupInfo: (backupFile) => ipcRenderer.invoke('getBackupInfo', backupFile),
  getBackupHistory: () => ipcRenderer.invoke('getBackupHistory'),
  deleteBackup: (backupPath) => ipcRenderer.invoke('deleteBackup', backupPath),
  clearBackupHistory: () => ipcRenderer.invoke('clearBackupHistory'),
  setAutoBackup: (enabled) => ipcRenderer.invoke('setAutoBackup', enabled),
  getDefaultBackupPath: () => ipcRenderer.invoke('getDefaultBackupPath'),
  onBackupProgress: (callback) => ipcRenderer.on('backup-progress', (_, data) => callback(data)),
  onRestoreProgress: (callback) => ipcRenderer.on('restore-progress', (_, data) => callback(data)),
  showSaveDialog: (options) => ipcRenderer.invoke('showSaveDialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('showOpenDialog', options),

  // User data management
  clearUserData: () => ipcRenderer.invoke('clear-user-data'),

  // Backup scheduler functions
  getBackupSchedule: () => ipcRenderer.invoke('getBackupSchedule'),
  setBackupSchedule: (schedule) => ipcRenderer.invoke('setBackupSchedule', schedule),
  getNextBackupTime: (schedule) => ipcRenderer.invoke('getNextBackupTime', schedule),
  runBackupNow: () => ipcRenderer.invoke('runBackupNow')
});

contextBridge.exposeInMainWorld('wintoolAPI', {
  launchSystemTool: (toolId) => ipcRenderer.invoke('launch-system-tool', toolId),
  undoGameBooster: () => ipcRenderer.invoke('undoGameBooster')
});

contextBridge.exposeInMainWorld('networkingAPI', {
  getNetworkStatus: () => ipcRenderer.invoke('get-network-status'),
});
