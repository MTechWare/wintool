/**
 * Window Management Module
 * Handles window creation, management, and control functionality
 */

const { BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

class WindowManager {
    /**
     * Creates a new WindowManager instance.
     * Initializes window references, creation attempt tracking, and sets up IPC handlers.
     *
     * @constructor
     */
    constructor() {
        this.mainWindow = null;
        this.logViewerWindow = null;
        this.windowCreationAttempts = 0;
        this.MAX_WINDOW_CREATION_ATTEMPTS = 3;

        // Bind methods to preserve context
        this.createWindow = this.createWindow.bind(this);
        this.showWindow = this.showWindow.bind(this);
        this.hideWindow = this.hideWindow.bind(this);
        this.createLogViewerWindow = this.createLogViewerWindow.bind(this);
        this.createPerformanceSettingsWindow = this.createPerformanceSettingsWindow.bind(this);

        this.setupIpcHandlers();
    }

    /**
     * Set up IPC handlers for window management operations.
     * Handles window minimize, maximize, close, and other window control operations.
     *
     * @returns {void}
     */
    setupIpcHandlers() {
        // Window control IPC handlers
        ipcMain.handle('minimize-window', async () => {
            if (this.mainWindow) {
                // Always hide to tray when minimizing
                this.hideWindow();

                // Show notification on first hide to tray
                const settingsStore = await this.getStore();
                if (settingsStore && !settingsStore.get('trayNotificationShown', false)) {
                    if (this.systemTray) {
                        this.systemTray.displayBalloon({
                            iconType: 'info',
                            title: 'WinTool',
                            content:
                                'Application was minimized to tray. Click the tray icon to restore.',
                        });
                    }
                    settingsStore.set('trayNotificationShown', true);
                }
            }
            return true;
        });

        ipcMain.handle('maximize-window', () => {
            if (this.mainWindow) {
                if (this.mainWindow.isMaximized()) {
                    this.mainWindow.unmaximize();
                } else {
                    this.mainWindow.maximize();
                }
            }
            return true;
        });

        ipcMain.handle('close-window', () => {
            if (this.mainWindow) this.mainWindow.close();
            return true;
        });

        ipcMain.handle('hide-to-tray', () => {
            this.hideWindow();
            return true;
        });

        ipcMain.handle('show-from-tray', async () => {
            await this.showWindow();
            return true;
        });

        ipcMain.handle('set-window-opacity', (event, opacity) => {
            if (this.mainWindow) {
                this.mainWindow.setOpacity(opacity);
            }
        });

        ipcMain.handle('open-log-viewer', () => {
            this.createLogViewerWindow();
        });

        ipcMain.handle('open-performance-settings', () => {
            this.createPerformanceSettingsWindow();
        });
    }

    // Dependency injection methods
    setDependencies(dependencies) {
        this.getStore = dependencies.getStore;
        this.systemTray = dependencies.systemTray;
        this.app = dependencies.app;
    }

    /**
     * Create the main application window
     */
    async createWindow() {
        this.windowCreationAttempts++;

        try {
            // Get screen dimensions for responsive sizing
            const primaryDisplay = screen.getPrimaryDisplay();
            const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

            // Validate screen dimensions
            if (screenWidth < 800 || screenHeight < 600) {
                console.warn(`Screen dimensions too small: ${screenWidth}x${screenHeight}`);
            }

            // Always use % of screen for window size
            const windowSizePercent = 0.8;
            const windowWidth = Math.max(800, Math.round(screenWidth * windowSizePercent));
            const windowHeight = Math.max(600, Math.round(screenHeight * windowSizePercent));

            // Get transparency setting before creating the window
            const settingsStore = await this.getStore();
            let opacity = settingsStore ? settingsStore.get('transparency', 1) : 1;
            let useTransparent = settingsStore
                ? settingsStore.get('useTransparentWindow', false)
                : false;

            // If we've had multiple failed attempts, disable transparency
            if (this.windowCreationAttempts > 1) {
                useTransparent = false;
                if (settingsStore) {
                    settingsStore.set('useTransparentWindow', false);
                }
            }

            // Ensure opacity is within valid range and not causing invisible window
            if (opacity < 0.3) {
                opacity = 0.3;
                if (settingsStore) {
                    settingsStore.set('transparency', opacity);
                }
            }
            if (opacity > 1) {
                opacity = 1;
            }

            // Calculate window position to ensure it's on screen
            const x = Math.max(0, Math.round((screenWidth - windowWidth) / 2));
            const y = Math.max(0, Math.round((screenHeight - windowHeight) / 2));

            // Create the browser window with improved settings and Chromium optimizations
            const windowOptions = {
                width: windowWidth,
                height: windowHeight,
                minWidth: 800,
                minHeight: 600,
                x: x,
                y: y,
                icon: path.join(__dirname, '..', 'assets/images/icon.ico'),
                webPreferences: {
                    preload: path.join(__dirname, '..', 'preload.js'),
                    nodeIntegration: false,
                    contextIsolation: true,
                    enableRemoteModule: false,
                    devTools: process.env.NODE_ENV !== 'production',
                    webSecurity: true,
                    sandbox: false,
                    experimentalFeatures: false,
                    enableBlinkFeatures: '',
                    disableBlinkFeatures: 'Auxclick',
                    backgroundThrottling: false,
                    offscreen: false,
                },
                frame: false,
                transparent: useTransparent,
                show: false,
                center: false,
                opacity: opacity,
                backgroundColor: useTransparent ? undefined : '#1a1a1a',
                titleBarStyle: 'hidden',
                skipTaskbar: false,
                alwaysOnTop: false,
            };

            this.mainWindow = new BrowserWindow(windowOptions);
        } catch (error) {
            console.error('Error creating BrowserWindow:', error);

            if (this.windowCreationAttempts < this.MAX_WINDOW_CREATION_ATTEMPTS) {
                const settingsStore = await this.getStore();
                if (settingsStore) {
                    settingsStore.set('useTransparentWindow', false);
                    settingsStore.set('transparency', 1);
                }
                return await this.createWindow();
            } else {
                throw new Error(
                    `Failed to create window after ${this.MAX_WINDOW_CREATION_ATTEMPTS} attempts: ${error.message}`
                );
            }
        }

        // Load the main HTML file
        this.mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

        // Apply always on top setting
        const settingsStore = await this.getStore();
        const topMost = settingsStore ? settingsStore.get('topMost', false) : false;
        if (topMost) {
            this.mainWindow.setAlwaysOnTop(true);
        }

        // Show window when ready with improved visibility handling
        this.mainWindow.once('ready-to-show', () => {
            this.handleReadyToShow();
        });

        // Handle window close event (always hide to tray instead of closing)
        this.mainWindow.on('close', async event => {
            if (!this.app.isQuiting) {
                event.preventDefault();
                this.hideWindow();

                // Show notification on first hide to tray
                const settingsStore = await this.getStore();
                if (settingsStore && !settingsStore.get('trayNotificationShown', false)) {
                    if (this.systemTray) {
                        this.systemTray.displayBalloon({
                            iconType: 'info',
                            title: 'WinTool',
                            content:
                                'Application was minimized to tray. Click the tray icon to restore.',
                        });
                    }
                    settingsStore.set('trayNotificationShown', true);
                }
            }
        });

        // Handle window closed
        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });

        return this.mainWindow;
    }

    handleReadyToShow() {
        try {
            // Ensure window is properly positioned before showing
            const bounds = this.mainWindow.getBounds();

            // Verify window is within screen bounds
            const primaryDisplay = screen.getPrimaryDisplay();
            const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

            if (bounds.x < 0 || bounds.y < 0 || bounds.x > screenWidth || bounds.y > screenHeight) {
                this.mainWindow.center();
            }

            // Show the window
            this.mainWindow.show();
            this.mainWindow.focus();

            // Verify visibility after a short delay
            setTimeout(() => {
                if (this.mainWindow) {
                    const isVisible = this.mainWindow.isVisible();
                    const currentOpacity = this.mainWindow.getOpacity();

                    if (!isVisible) {
                        this.handleVisibilityRecovery(currentOpacity);
                    } else {
                        // Reset creation attempts on successful show
                        this.windowCreationAttempts = 0;
                    }
                }
            }, 200);
        } catch (error) {
            console.error('Error in ready-to-show handler:', error);
            this.handleShowFallback();
        }
    }

    handleVisibilityRecovery(currentOpacity) {
        try {
            // Strategy 1: Increase opacity if too low
            if (currentOpacity < 0.3) {
                this.mainWindow.setOpacity(0.8);
            }

            // Strategy 2: Show inactive then active
            this.mainWindow.showInactive();
            setTimeout(() => {
                if (this.mainWindow) {
                    this.mainWindow.show();
                    this.mainWindow.focus();
                    this.mainWindow.moveTop();
                }
            }, 100);
        } catch (recoveryError) {
            console.error('Recovery attempt failed:', recoveryError);
        }
    }

    handleShowFallback() {
        try {
            this.mainWindow.showInactive();
            setTimeout(() => {
                if (this.mainWindow) {
                    this.mainWindow.show();
                }
            }, 100);
        } catch (fallbackError) {
            console.error('Fallback show also failed:', fallbackError);
            // Last resort: recreate window without transparency
            setTimeout(async () => {
                const settingsStore = await this.getStore();
                if (settingsStore) {
                    settingsStore.set('useTransparentWindow', false);
                    this.mainWindow = null;
                    this.createWindow();
                }
            }, 500);
        }
    }

    /**
     * Show main window with improved visibility handling
     */
    async showWindow() {
        if (this.mainWindow) {
            try {
                // Check if window is destroyed
                if (this.mainWindow.isDestroyed()) {
                    this.mainWindow = null;
                    await this.createWindow();
                    return;
                }

                // Restore if minimized
                if (this.mainWindow.isMinimized()) {
                    this.mainWindow.restore();
                }

                // Ensure window is visible
                this.mainWindow.show();
                this.mainWindow.focus();

                // Double-check visibility and force if needed
                setTimeout(() => {
                    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                        const stillVisible = this.mainWindow.isVisible();
                        if (!stillVisible) {
                            this.handleVisibilityRecovery(this.mainWindow.getOpacity());
                        }
                    }
                }, 200);
            } catch (error) {
                console.error('Error showing existing window:', error);
                // Try to recreate window if showing fails
                this.mainWindow = null;
                await this.createWindow();
            }
        } else {
            await this.createWindow();
        }
    }

    /**
     * Hide main window
     */
    hideWindow() {
        if (this.mainWindow) {
            this.mainWindow.hide();
        }
    }

    /**
     * Create log viewer window
     */
    createLogViewerWindow() {
        if (this.logViewerWindow) {
            this.logViewerWindow.focus();
            return;
        }

        this.logViewerWindow = new BrowserWindow({
            width: 800,
            height: 600,
            title: 'Log Viewer',
            webPreferences: {
                preload: path.join(__dirname, '..', 'preload.js'),
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false,
                webSecurity: true,
                sandbox: false,
                devTools: process.env.NODE_ENV !== 'production',
            },
        });

        this.logViewerWindow.loadFile(path.join(__dirname, '..', 'log-viewer.html'));

        this.logViewerWindow.webContents.on('did-finish-load', async () => {
            const settingsStore = await this.getStore();
            if (settingsStore) {
                const themeSettings = {
                    theme: settingsStore.get('theme', 'classic-dark'),
                    primaryColor: settingsStore.get('primaryColor', '#ff9800'),
                    customTheme: settingsStore.get('customTheme', {}),
                    rainbowMode: settingsStore.get('rainbowMode', false),
                };
                this.logViewerWindow.webContents.send('theme-data', themeSettings);
            }
        });

        this.logViewerWindow.on('closed', () => {
            this.logViewerWindow = null;
        });
    }

    /**
     * Create performance settings window
     */
    createPerformanceSettingsWindow() {
        const performanceWindow = new BrowserWindow({
            width: 900,
            height: 700,
            title: 'Performance Settings - WinTool',
            webPreferences: {
                preload: path.join(__dirname, '..', 'preload.js'),
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false,
                webSecurity: true,
                sandbox: false,
                devTools: process.env.NODE_ENV !== 'production',
            },
            parent: this.mainWindow,
            modal: true,
            resizable: true,
            minimizable: false,
            maximizable: false,
        });

        performanceWindow.loadFile(path.join(__dirname, '..', 'performance-settings.html'));

        performanceWindow.on('closed', () => {
            // Window closed
        });

        return performanceWindow;
    }

    // Getters for external access
    getMainWindow() {
        return this.mainWindow;
    }

    getLogViewerWindow() {
        return this.logViewerWindow;
    }
}

module.exports = WindowManager;
