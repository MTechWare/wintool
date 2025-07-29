/**
 * System Tray Module
 * Handles system tray creation, menu management, and tray-related functionality
 */

const { ipcMain, Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');

class SystemTray {
    /**
     * Creates a new SystemTray instance.
     * Initializes tray state and sets up IPC handlers for tray management.
     *
     * @constructor
     */
    constructor() {
        this.tray = null;

        // Bind methods to preserve context
        this.createTray = this.createTray.bind(this);
        this.destroyTray = this.destroyTray.bind(this);
        this.quitApplication = this.quitApplication.bind(this);

        this.setupIpcHandlers();
    }

    /**
     * Set up IPC handlers for system tray operations.
     * Handles quit application requests from renderer processes.
     *
     * @returns {void}
     */
    setupIpcHandlers() {
        // System tray IPC handlers
        ipcMain.handle('quit-app', () => {
            this.quitApplication();
            return true;
        });
    }

    /**
     * Set dependencies for the system tray using dependency injection.
     * Allows injection of window manager and app instance.
     *
     * @param {Object} dependencies - Object containing dependency instances
     * @param {Object} dependencies.windowManager - Window manager instance
     * @param {Object} dependencies.app - Electron app instance
     * @returns {void}
     */
    setDependencies(dependencies) {
        this.windowManager = dependencies.windowManager;
        this.app = dependencies.app;
    }

    /**
     * Create system tray
     */
    createTray() {
        // Create tray icon using the application icon
        const trayIconPath = path.join(__dirname, '..', 'assets', 'images', 'icon.ico');

        try {
            // Create native image for tray icon
            const trayIcon = nativeImage.createFromPath(trayIconPath);

            // Check if icon was loaded successfully
            if (trayIcon.isEmpty()) {
                console.warn('Tray icon could not be loaded, using default');
                // Fallback to a simple icon or let system use default
            }

            // Create tray
            this.tray = new Tray(trayIcon);

            // Set tooltip
            this.tray.setToolTip('WinTool');

            // Create context menu
            const contextMenu = Menu.buildFromTemplate([
                {
                    label: 'Show WinTool',
                    click: async () => {
                        if (this.windowManager) {
                            await this.windowManager.showWindow();
                        }
                    },
                },
                {
                    label: 'Hide WinTool',
                    click: () => {
                        if (this.windowManager) {
                            this.windowManager.hideWindow();
                        }
                    },
                },
                {
                    type: 'separator',
                },
                {
                    label: 'Settings',
                    click: async () => {
                        if (this.windowManager) {
                            await this.windowManager.showWindow();
                            // Send message to renderer to show settings
                            const mainWindow = this.windowManager.getMainWindow();
                            if (mainWindow) {
                                mainWindow.webContents.send('show-settings');
                            }
                        }
                    },
                },
                {
                    type: 'separator',
                },
                {
                    label: 'Quit WinTool',
                    click: () => {
                        this.quitApplication();
                    },
                },
            ]);

            // Set context menu
            this.tray.setContextMenu(contextMenu);

            // Handle tray icon click (show/hide window)
            this.tray.on('click', async () => {
                if (this.windowManager) {
                    const mainWindow = this.windowManager.getMainWindow();
                    if (mainWindow && mainWindow.isVisible()) {
                        this.windowManager.hideWindow();
                    } else {
                        await this.windowManager.showWindow();
                    }
                }
            });

            console.log('System tray created successfully');
        } catch (error) {
            console.error('Failed to create system tray:', error);
        }
    }

    /**
     * Destroy the system tray
     */
    destroyTray() {
        if (this.tray) {
            this.tray.destroy();
            this.tray = null;
            console.log('System tray destroyed');
        }
    }

    /**
     * Get the tray instance
     */
    getTray() {
        return this.tray;
    }

    /**
     * Update tray tooltip
     */
    setTooltip(tooltip) {
        if (this.tray) {
            this.tray.setToolTip(tooltip);
        }
    }

    /**
     * Display balloon notification (Windows only)
     */
    displayBalloon(options) {
        if (this.tray && process.platform === 'win32') {
            this.tray.displayBalloon({
                iconType: options.iconType || 'info',
                title: options.title || 'WinTool',
                content: options.content || '',
            });
        }
    }

    /**
     * Update context menu
     */
    updateContextMenu(menuTemplate) {
        if (this.tray) {
            const contextMenu = Menu.buildFromTemplate(menuTemplate);
            this.tray.setContextMenu(contextMenu);
        }
    }

    /**
     * Quit application properly
     */
    quitApplication() {
        if (this.app) {
            this.app.isQuiting = true;
            this.app.quit();
        } else {
            // Fallback if app reference is not available
            app.isQuiting = true;
            app.quit();
        }
    }

    /**
     * Check if tray is available on the system
     */
    isTraySupported() {
        // Tray.isSupported() is not available in all Electron versions
        // Assume tray is supported on all platforms for now
        return true;
    }

    /**
     * Handle app events related to tray
     */
    setupAppEventHandlers() {
        // Note: App event handlers are managed by main.js to avoid conflicts
        // This method is kept for future use if needed
    }

    /**
     * Initialize the system tray
     */
    initialize() {
        if (!this.isTraySupported()) {
            console.warn('System tray is not supported on this platform');
            return false;
        }

        this.createTray();
        this.setupAppEventHandlers();
        return true;
    }
}

module.exports = SystemTray;
