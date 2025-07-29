/**
 * Settings Management Module
 * Handles settings store functionality and related IPC handlers
 */

const { ipcMain, dialog, app } = require('electron');
const path = require('path');
const os = require('os');

class SettingsManager {
    /**
     * Creates a new SettingsManager instance.
     * Initializes the settings store and sets up IPC handlers for settings management.
     *
     * @constructor
     */
    constructor() {
        this.store = null;

        // Bind methods to preserve context
        this.getStore = this.getStore.bind(this);
        this.getSetting = this.getSetting.bind(this);
        this.setSetting = this.setSetting.bind(this);
        this.clearAllSettings = this.clearAllSettings.bind(this);

        this.setupIpcHandlers();
    }

    /**
     * Set up IPC handlers for settings management operations.
     * Handles get/set settings, performance modes, themes, and other configuration options.
     *
     * @returns {void}
     */
    setupIpcHandlers() {
        // Basic settings IPC handlers
        ipcMain.handle('get-setting', async (event, key, defaultValue) => {
            const settingsStore = await this.getStore();
            if (!settingsStore) return defaultValue;
            return settingsStore.get(key, defaultValue);
        });

        ipcMain.handle('set-setting', async (event, key, value) => {
            const settingsStore = await this.getStore();
            if (!settingsStore) return false;

            settingsStore.set(key, value);

            // Handle special settings that require immediate action
            await this.handleSpecialSetting(key, value);

            return true;
        });

        // Performance settings handlers
        ipcMain.handle('get-performance-mode', async () => {
            const settingsStore = await this.getStore();
            return settingsStore ? settingsStore.get('performanceMode', 'balanced') : 'balanced';
        });

        ipcMain.handle('set-performance-mode', async (event, mode) => {
            const settingsStore = await this.getStore();
            if (!settingsStore) return false;

            try {
                settingsStore.set('performanceMode', mode);

                // Apply immediate optimizations based on mode
                if (mode === 'low-end') {
                    settingsStore.set('fastSystemInfo', true);
                    settingsStore.set('cacheSystemInfo', true);
                    settingsStore.set('enableDiscordRpc', false);
                    settingsStore.set('enableLazyLoading', true);
                } else if (mode === 'high-end') {
                    settingsStore.set('fastSystemInfo', false);
                    settingsStore.set('cacheSystemInfo', false); // Disable caching for real-time data
                    settingsStore.set('enableDiscordRpc', true);
                    settingsStore.set('enableLazyLoading', false); // Disable lazy loading for instant access
                } else if (mode === 'balanced') {
                    settingsStore.set('fastSystemInfo', true);
                    settingsStore.set('cacheSystemInfo', true);
                    settingsStore.set('enableDiscordRpc', true);
                    settingsStore.set('enableLazyLoading', true);
                }

                return true;
            } catch (error) {
                console.error('Error setting performance mode:', error);
                return false;
            }
        });

        // Clear all settings handler
        ipcMain.handle('clear-all-settings', async () => {
            const settingsStore = await this.getStore();
            if (!settingsStore) return false;

            try {
                // Clear all data from the store
                settingsStore.clear();
                return true;
            } catch (error) {
                console.error('Error clearing all settings:', error);
                return false;
            }
        });

        // Plugin storage handlers
        ipcMain.handle('plugin-storage-get', async (event, pluginId, key) => {
            const settingsStore = await this.getStore();
            if (!settingsStore) return null;
            // Namespace the key to prevent collisions
            const namespacedKey = `plugin_${pluginId}_${key}`;
            return settingsStore.get(namespacedKey);
        });

        ipcMain.handle('plugin-storage-set', async (event, pluginId, key, value) => {
            const settingsStore = await this.getStore();
            if (!settingsStore) return false;
            const namespacedKey = `plugin_${pluginId}_${key}`;
            settingsStore.set(namespacedKey, value);
            return true;
        });

        // Plugin state management
        ipcMain.handle('toggle-plugin-state', async (event, pluginId) => {
            const settingsStore = await this.getStore();
            if (!settingsStore) {
                return { success: false, message: 'Settings store not available.' };
            }

            try {
                let disabledPlugins = settingsStore.get('disabledPlugins', []);
                const isCurrentlyEnabled = !disabledPlugins.includes(pluginId);

                if (isCurrentlyEnabled) {
                    // Disable it
                    disabledPlugins.push(pluginId);
                } else {
                    // Enable it
                    disabledPlugins = disabledPlugins.filter(id => id !== pluginId);
                }

                settingsStore.set('disabledPlugins', disabledPlugins);

                // Notify the user and ask for a restart
                const actionText = isCurrentlyEnabled ? 'disabled' : 'enabled';
                const mainWindow = this.windowManager ? this.windowManager.getMainWindow() : null;

                if (mainWindow) {
                    const restartChoice = await dialog.showMessageBox(mainWindow, {
                        type: 'info',
                        title: `Plugin ${actionText}`,
                        message: `The plugin "${pluginId}" has been ${actionText}.`,
                        detail: 'A restart is required for this change to take effect.',
                        buttons: ['Restart Now', 'Restart Later'],
                        defaultId: 0,
                        cancelId: 1,
                    });

                    if (restartChoice.response === 0) {
                        // "Restart Now"
                        if (this.restartApp) {
                            this.restartApp();
                        } else {
                            app.relaunch();
                            app.exit();
                        }
                    }
                }

                return {
                    success: true,
                    isEnabled: !isCurrentlyEnabled,
                    message: `Plugin ${actionText} successfully.`,
                };
            } catch (error) {
                console.error('Error toggling plugin state:', error);
                return { success: false, message: `Error toggling plugin state: ${error.message}` };
            }
        });
    }

    // Dependency injection method
    setDependencies(dependencies) {
        this.discordPresence = dependencies.discordPresence;
        this.windowManager = dependencies.windowManager;
        this.restartApp = dependencies.restartApp;
    }

    /**
     * Get the app data path for storing settings
     */
    getAppDataPath() {
        const userDataPath = os.homedir();
        const appDataPath = path.join(userDataPath, 'MTechWare', 'WinTool');
        return appDataPath;
    }

    /**
     * Load store on demand
     */
    async getStore() {
        if (!this.store) {
            try {
                const Store = await import('electron-store');
                // Configure electron-store to use our custom MTechWare\WinTool directory
                this.store = new Store.default({
                    cwd: this.getAppDataPath(),
                    name: 'settings',
                    defaults: {
                        theme: 'classic-dark',
                        primaryColor: '#ff9800',
                        transparency: 1,
                        topMost: false,
                        useTransparentWindow: false,
                        enableDiscordRpc: true,
                        performanceMode: 'balanced',
                        fastSystemInfo: false,
                        cacheSystemInfo: true,
                        enableLazyLoading: true,
                        clearPluginCache: false,
                        disabledPlugins: [],
                        elevationChoice: 'ask',
                        trayNotificationShown: false,
                        hasCustomizedPerformanceSettings: false,
                        rainbowMode: false,
                        customTheme: {},
                    },
                });
            } catch (error) {
                console.error('Failed to initialize settings store:', error);
                return null;
            }
        }
        return this.store;
    }

    /**
     * Get a setting value
     */
    async getSetting(key, defaultValue) {
        const settingsStore = await this.getStore();
        if (!settingsStore) return defaultValue;
        return settingsStore.get(key, defaultValue);
    }

    /**
     * Set a setting value
     */
    async setSetting(key, value) {
        const settingsStore = await this.getStore();
        if (!settingsStore) return false;

        settingsStore.set(key, value);

        // Handle special settings that require immediate action
        await this.handleSpecialSetting(key, value);

        return true;
    }

    /**
     * Handle special settings that require immediate action
     */
    async handleSpecialSetting(key, value) {
        try {
            if (key === 'enableDiscordRpc' && this.discordPresence) {
                if (value) {
                    this.discordPresence.start();
                } else {
                    this.discordPresence.stop();
                }
            }

            if (key === 'topMost' && this.windowManager) {
                const mainWindow = this.windowManager.getMainWindow();
                if (mainWindow) {
                    mainWindow.setAlwaysOnTop(value);
                }
            }
        } catch (error) {
            console.error('Error handling special setting:', key, error);
        }
    }

    /**
     * Clear all settings
     */
    async clearAllSettings() {
        const settingsStore = await this.getStore();
        if (!settingsStore) return false;

        try {
            settingsStore.clear();
            return true;
        } catch (error) {
            console.error('Error clearing all settings:', error);
            return false;
        }
    }

    /**
     * Get disabled plugins list
     */
    async getDisabledPlugins() {
        const settingsStore = await this.getStore();
        return settingsStore ? settingsStore.get('disabledPlugins', []) : [];
    }

    /**
     * Update disabled plugins list
     */
    async setDisabledPlugins(disabledPlugins) {
        const settingsStore = await this.getStore();
        if (!settingsStore) return false;

        settingsStore.set('disabledPlugins', disabledPlugins);
        return true;
    }

    /**
     * Remove plugin from disabled list (used when deleting plugins)
     */
    async removePluginFromDisabled(pluginId) {
        const settingsStore = await this.getStore();
        if (!settingsStore) return false;

        const disabledPlugins = settingsStore.get('disabledPlugins', []);
        const newDisabled = disabledPlugins.filter(id => id !== pluginId);
        settingsStore.set('disabledPlugins', newDisabled);
        return true;
    }

    /**
     * Apply performance optimizations based on system capabilities
     */
    async applyPerformanceOptimizations(systemCapabilities) {
        try {
            const settingsStore = await this.getStore();
            if (!settingsStore) return;

            // Check if user has customized performance settings
            const hasCustomizedSettings = settingsStore.get(
                'hasCustomizedPerformanceSettings',
                false
            );

            if (hasCustomizedSettings) {
                return; // Don't override user's custom settings
            }

            if (systemCapabilities === 'low-end') {
                // Enable performance optimizations for low-end systems
                settingsStore.set('fastSystemInfo', true);
                settingsStore.set('performanceMode', 'low-end');
                settingsStore.set('cacheSystemInfo', true);
                settingsStore.set('enableDiscordRpc', false); // Disable Discord RPC for performance
                settingsStore.set('clearPluginCache', true); // Clear plugin cache to save memory
            } else if (systemCapabilities === 'high-end') {
                // Enable full features for high-end systems
                settingsStore.set('fastSystemInfo', false);
                settingsStore.set('performanceMode', 'high-end');
                settingsStore.set('cacheSystemInfo', true);
                settingsStore.set('enableDiscordRpc', true);
            } else {
                // Balanced settings for mid-range systems
                settingsStore.set('performanceMode', 'balanced');
                settingsStore.set('cacheSystemInfo', true);
            }
        } catch (error) {
            console.error('Error applying performance optimizations:', error);
        }
    }

    /**
     * Get theme settings for windows
     */
    async getThemeSettings() {
        const settingsStore = await this.getStore();
        if (!settingsStore) {
            return {
                theme: 'classic-dark',
                primaryColor: '#ff9800',
                customTheme: {},
                rainbowMode: false,
            };
        }

        return {
            theme: settingsStore.get('theme', 'classic-dark'),
            primaryColor: settingsStore.get('primaryColor', '#ff9800'),
            customTheme: settingsStore.get('customTheme', {}),
            rainbowMode: settingsStore.get('rainbowMode', false),
        };
    }
}

module.exports = SettingsManager;
