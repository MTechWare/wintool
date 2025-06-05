/**
 * WinTool - Preload Script
 *
 * This script runs in the renderer process and exposes
 * safe APIs to the main process through contextBridge
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Window controls
    minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
    maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
    closeWindow: () => ipcRenderer.invoke('close-window'),

    // System tray controls
    hideToTray: () => ipcRenderer.invoke('hide-to-tray'),
    showFromTray: () => ipcRenderer.invoke('show-from-tray'),
    quitApp: () => ipcRenderer.invoke('quit-app'),

    // Settings
    getSetting: (key, defaultValue) => ipcRenderer.invoke('get-setting', key, defaultValue),
    setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),




    // Settings management
    clearAllSettings: () => ipcRenderer.invoke('clear-all-settings'),
    restartApplication: () => ipcRenderer.invoke('restart-application'),

    // System information
    getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
    getNetworkStats: () => ipcRenderer.invoke('get-network-stats'),

    // Tab folder management
    getTabFolders: () => ipcRenderer.invoke('get-tab-folders'),
    getTabContent: (tabFolder) => ipcRenderer.invoke('get-tab-content', tabFolder),

    // Winget package management
    executeWingetCommand: (command) => ipcRenderer.invoke('execute-winget-command', command),
    executeWingetCommandWithProgress: (command, progressCallback) => {
        return new Promise((resolve, reject) => {
            // Set up progress listener
            const progressHandler = (event, progressData) => {
                progressCallback(progressData);
            };

            ipcRenderer.on('winget-progress', progressHandler);

            // Execute the command
            ipcRenderer.invoke('execute-winget-command-with-progress', command)
                .then((result) => {
                    ipcRenderer.removeListener('winget-progress', progressHandler);
                    resolve(result);
                })
                .catch((error) => {
                    ipcRenderer.removeListener('winget-progress', progressHandler);
                    reject(error);
                });
        });
    },
    getApplicationsData: () => ipcRenderer.invoke('get-applications-data'),

    // Cleanup functionality
    getDiskSpace: () => ipcRenderer.invoke('get-disk-space'),
    scanCleanupCategory: (category) => ipcRenderer.invoke('scan-cleanup-category', category),
    executeCleanup: (category) => ipcRenderer.invoke('execute-cleanup', category),
    openDiskCleanup: () => ipcRenderer.invoke('open-disk-cleanup'),

    // Services management
    getServices: () => ipcRenderer.invoke('get-services'),
    controlService: (serviceName, action) => ipcRenderer.invoke('control-service', serviceName, action),
    getServiceDetails: (serviceName) => ipcRenderer.invoke('get-service-details', serviceName),

    // System utilities
    launchSystemUtility: (utilityCommand) => ipcRenderer.invoke('launch-system-utility', utilityCommand),

    // Event listeners (for future use)
    onMessage: (callback) => ipcRenderer.on('message', callback),
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

console.log('WinTool preload script loaded');
