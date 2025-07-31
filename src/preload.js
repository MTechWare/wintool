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
    setWindowOpacity: opacity => ipcRenderer.invoke('set-window-opacity', opacity),
    setStartupBehavior: shouldStartOnBoot =>
        ipcRenderer.invoke('set-startup-behavior', shouldStartOnBoot),

    // Enhanced Log Viewer
    openLogViewer: () => ipcRenderer.invoke('open-log-viewer'),
    onLogMessage: callback =>
        ipcRenderer.on('log-message', (event, level, message, source) =>
            callback(level, message, source)
        ),
    onThemeData: callback =>
        ipcRenderer.on('theme-data', (event, themeData) => callback(themeData)),

    // Custom logging methods for plugins and tabs
    logInfo: (message, source) => ipcRenderer.invoke('log-custom-message', 'info', message, source),
    logWarn: (message, source) => ipcRenderer.invoke('log-custom-message', 'warn', message, source),
    logError: (message, source) =>
        ipcRenderer.invoke('log-custom-message', 'error', message, source),
    logDebug: (message, source) =>
        ipcRenderer.invoke('log-custom-message', 'debug', message, source),
    logSuccess: (message, source) =>
        ipcRenderer.invoke('log-custom-message', 'success', message, source),

    // Performance Monitoring
    startPerformanceUpdates: () => ipcRenderer.invoke('start-performance-updates'),
    stopPerformanceUpdates: () => ipcRenderer.invoke('stop-performance-updates'),
    onPerformanceUpdate: callback =>
        ipcRenderer.on('performance-update', (event, metrics) => callback(metrics)),

    // Performance Settings
    getPerformanceMode: () => ipcRenderer.invoke('get-performance-mode'),
    setPerformanceMode: mode => ipcRenderer.invoke('set-performance-mode', mode),
    getSystemCapabilities: () => ipcRenderer.invoke('get-system-capabilities'),
    openPerformanceSettings: () => ipcRenderer.invoke('open-performance-settings'),

    // Generic command execution
    runCommand: (command, asAdmin = false) => ipcRenderer.invoke('run-command', command, asAdmin),
    runAdminCommand: command => ipcRenderer.invoke('run-admin-command', command),

    // Settings management
    clearAllSettings: () => ipcRenderer.invoke('clear-all-settings'),
    restartApplication: () => ipcRenderer.invoke('restart-application'),

    // System information
    getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
    getSystemHealthInfo: () => ipcRenderer.invoke('get-system-health-info'),
    clearSystemInfoCache: () => ipcRenderer.invoke('clear-system-info-cache'),
    getNetworkStats: () => ipcRenderer.invoke('get-network-stats'),

    // Tab folder management
    getTabFolders: () => ipcRenderer.invoke('get-tab-folders'),
    getTabContent: tabFolder => ipcRenderer.invoke('get-tab-content', tabFolder),

    // Winget package management
    executeWingetCommand: command => ipcRenderer.invoke('execute-winget-command', command),
    executeWingetCommandWithProgress: (command, progressCallback) => {
        return new Promise((resolve, reject) => {
            // Set up progress listener
            const progressHandler = (event, progressData) => {
                progressCallback(progressData);
            };

            ipcRenderer.on('winget-progress', progressHandler);

            // Execute the command
            ipcRenderer
                .invoke('execute-winget-command-with-progress', command)
                .then(result => {
                    ipcRenderer.removeListener('winget-progress', progressHandler);
                    resolve(result);
                })
                .catch(error => {
                    ipcRenderer.removeListener('winget-progress', progressHandler);
                    reject(error);
                });
        });
    },

    // Chocolatey package management
    checkChocoAvailability: () => ipcRenderer.invoke('check-choco-availability'),
    executeChocoCommand: command => ipcRenderer.invoke('execute-choco-command', command),
    executeChocoCommandWithProgress: (command, progressCallback) => {
        return new Promise((resolve, reject) => {
            // Set up progress listener
            const progressHandler = (event, progressData) => {
                progressCallback(progressData);
            };

            ipcRenderer.on('choco-progress', progressHandler);

            // Execute the command
            ipcRenderer
                .invoke('execute-choco-command-with-progress', command)
                .then(result => {
                    ipcRenderer.removeListener('choco-progress', progressHandler);
                    resolve(result);
                })
                .catch(error => {
                    ipcRenderer.removeListener('choco-progress', progressHandler);
                    reject(error);
                });
        });
    },

    getApplicationsData: () => ipcRenderer.invoke('get-applications-data'),

    // Cleanup functionality
    getDiskSpace: () => ipcRenderer.invoke('get-disk-space'),
    executeCleanup: category => ipcRenderer.invoke('execute-cleanup', category),
    openDiskCleanup: () => ipcRenderer.invoke('open-disk-cleanup'),

    // Services management
    getServices: () => ipcRenderer.invoke('get-services'),
    controlService: (serviceName, action) =>
        ipcRenderer.invoke('control-service', serviceName, action),
    getServiceDetails: serviceName => ipcRenderer.invoke('get-service-details', serviceName),

    // System utilities
    launchSystemUtility: utilityCommand =>
        ipcRenderer.invoke('launch-system-utility', utilityCommand),

    // Environment variables management
    getEnvironmentVariables: () => ipcRenderer.invoke('get-environment-variables'),
    setEnvironmentVariable: (name, value, target) =>
        ipcRenderer.invoke('set-environment-variable', name, value, target),
    deleteEnvironmentVariable: (name, target) =>
        ipcRenderer.invoke('delete-environment-variable', name, target),

    // File operations
    showOpenDialog: options => ipcRenderer.invoke('show-open-dialog', options),
    writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
    readFile: filePath => ipcRenderer.invoke('read-file', filePath),
    saveFile: (content, options) =>
        ipcRenderer.invoke('save-file-dialog-and-write', content, options),
    openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),

    // Event listeners (for future use)
    onMessage: callback => ipcRenderer.on('message', callback),
    onDisplayNotification: callback =>
        ipcRenderer.on('display-notification', (event, ...args) => callback(...args)),
    removeAllListeners: channel => ipcRenderer.removeAllListeners(channel),
    send: (channel, data) => {
        ipcRenderer.send(channel, data);
    },
    on: (channel, func) => {
        ipcRenderer.on(channel, (event, ...args) => func(...args));
    },

    // Editor functions
    executeScript: (script, shell) => ipcRenderer.invoke('execute-script', { script, shell }),
    executePowerShell: command => ipcRenderer.invoke('execute-powershell', command),
    executeCmd: command => ipcRenderer.invoke('execute-cmd', command),
    executeCmdCommand: command => ipcRenderer.invoke('execute-cmd', command), // Alias for services tab
    finishStartupPhase: () => ipcRenderer.invoke('finish-startup-phase'),
    showSaveDialog: options => ipcRenderer.invoke('show-save-dialog', options),

    // Event Viewer functions
    getEventLogs: logName => ipcRenderer.invoke('get-event-logs', logName),

    // Plugin Management
    getAllPlugins: () => ipcRenderer.invoke('get-all-plugins'),
    installPlugin: () => ipcRenderer.invoke('install-plugin'),
    openPluginsDirectory: () => ipcRenderer.invoke('open-plugins-directory'),
    openAppDirectory: () => ipcRenderer.invoke('open-app-directory'),
    togglePluginState: pluginId => ipcRenderer.invoke('toggle-plugin-state', pluginId),
    deletePlugin: pluginId => ipcRenderer.invoke('delete-plugin', pluginId),
    refreshVerifiedPlugins: () => ipcRenderer.invoke('refresh-verified-plugins'),
    getVerifiedPlugins: () => ipcRenderer.invoke('get-verified-plugins'),
    toggleDevTools: () => ipcRenderer.invoke('toggle-dev-tools'),
    openSpecialFolder: folderKey => ipcRenderer.invoke('open-special-folder', folderKey),

    // Elevation Management
    requestElevation: () => ipcRenderer.invoke('request-elevation'),
    checkElevationStatus: () => ipcRenderer.invoke('check-elevation-status'),
});

// Expose a dedicated API for plugins
contextBridge.exposeInMainWorld('wintoolAPI', {
    /**
     * Executes a PowerShell script located inside the plugin's own directory.
     * @param {string} pluginId - The ID of the calling plugin (its folder name).
     * @param {string} scriptPath - The relative path to the script within the plugin's folder.
     * @returns {Promise<string>} A promise that resolves with the script's output.
     */
    runPluginScript: (pluginId, scriptPath) =>
        ipcRenderer.invoke('run-plugin-script', pluginId, scriptPath),

    /**
     * Requests system information from the main process.
     * @param {string} type - The specific type of system information needed (e.g., 'time', 'cpu').
     * @returns {Promise<object>} A promise that resolves with the requested system information.
     */
    getSystemInfo: type => ipcRenderer.invoke('get-system-info', type),

    /**
     * Shows a native-style notification to the user.
     * @param {object} options - The notification options.
     * @param {string} options.title - The title of the notification.
     * @param {string} options.body - The main text of the notification.
     * @param {string} [options.type='info'] - The type of notification ('info', 'success', 'warning', 'error').
     */
    showNotification: ({ title, body, type = 'info' }) => {
        ipcRenderer.send('plugin-show-notification', { title, body, type });
    },

    /**
     * Shows a native Windows notification for system alerts.
     * @param {object} options - The notification options.
     * @param {string} options.title - The title of the notification.
     * @param {string} options.body - The main text of the notification.
     * @param {string} [options.urgency='normal'] - The urgency level ('normal', 'critical', 'low').
     * @param {boolean} [options.silent=false] - Whether to play notification sound.
     * @param {boolean} [options.persistent=false] - Whether critical notifications should persist.
     * @returns {Promise<object>} A promise that resolves with the result.
     */
    showNativeNotification: ({
        title,
        body,
        urgency = 'normal',
        silent = false,
        persistent = false,
    }) => {
        return ipcRenderer.invoke('show-native-notification', {
            title,
            body,
            urgency,
            silent,
            persistent,
        });
    },

    /**
     * Test notification function for debugging.
     * @returns {Promise<object>} A promise that resolves with the result.
     */
    testNotification: () => {
        return ipcRenderer.invoke('test-notification');
    },

    /**
     * A namespaced key-value store for plugins to persist settings.
     */
    storage: {
        /**
         * Retrieves a value from the plugin's storage.
         * @param {string} pluginId - The ID of the calling plugin.
         * @param {string} key - The key of the data to retrieve.
         * @returns {Promise<any>} A promise that resolves with the stored value.
         */
        get: (pluginId, key) => ipcRenderer.invoke('plugin-storage-get', pluginId, key),
        /**
         * Saves a value to the plugin's storage.
         * @param {string} pluginId - The ID of the calling plugin.
         * @param {string} key - The key of the data to save.
         * @param {any} value - The value to store.
         * @returns {Promise<boolean>} A promise that resolves when the data is saved.
         */
        set: (pluginId, key, value) =>
            ipcRenderer.invoke('plugin-storage-set', pluginId, key, value),
    },

    /**
     * Functions for interacting with the file system via secure dialogs.
     */
    dialog: {
        /**
         * Shows a dialog to open a file.
         * @param {object} options - Electron showOpenDialog options.
         * @returns {Promise<{canceled: boolean, file: {path: string, content: string}|null}>}
         */
        showOpenDialog: options => ipcRenderer.invoke('plugin-show-open-dialog', options),
        /**
         * Shows a dialog to save a file.
         * @param {object} options - Electron showSaveDialog options.
         * @param {string} content - The content to write to the file if saved.
         * @returns {Promise<{canceled: boolean, path: string|null}>}
         */
        showSaveDialog: (options, content) =>
            ipcRenderer.invoke('plugin-show-save-dialog', options, content),
    },

    /**
     * An API for interacting with the WinTool tab system.
     */
    tabs: {
        /**
         * Adds a listener for a tab-related event.
         * @param {string} eventName - The name of the event (e.g., 'tab-switched').
         * @param {function} callback - The function to call when the event occurs. The callback will receive an event object with a `detail` property containing event-specific data.
         */
        on: (eventName, callback) => {
            if (window.tabEventManager) {
                window.tabEventManager.addEventListener(eventName, callback);
            }
        },
        /**
         * Removes a listener for a tab-related event.
         * @param {string} eventName - The name of the event.
         * @param {function} callback - The original callback function to remove.
         */
        off: (eventName, callback) => {
            if (window.tabEventManager) {
                window.tabEventManager.removeEventListener(eventName, callback);
            }
        },
    },

    /**
     * Invokes a handler registered by the plugin's backend.js script.
     * @param {string} pluginId - The ID of the calling plugin.
     * @param {string} handlerName - The name of the handler to invoke.
     * @param {...any} args - Arguments to pass to the backend handler.
     * @returns {Promise<any>} A promise that resolves with the return value from the backend handler.
     */
    invoke: (pluginId, handlerName, ...args) =>
        ipcRenderer.invoke('plugin-invoke', pluginId, handlerName, ...args),
});

console.log('WinTool preload script loaded');
