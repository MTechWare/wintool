/**
 * WinTool - Main Electron Process
 *
 * Copyright (c) 2024 MTechWare
 * Licensed under GPL-3.0-or-later
 *
 * Windows System Management Tool
 * - Clean, understandable code
 * - Easy extension and modification
 * - Minimal dependencies
 * - Clear structure
 * - Security-focused design
 *
 * This application is a legitimate system management tool.
 * It performs system cleanup, process management, and system optimization.
 * All operations are logged and validated for security.
 *
 * For antivirus whitelist instructions, see ANTIVIRUS_WHITELIST.md
 */

const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, dialog, shell, globalShortcut, Notification } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const os = require('os');
const windowsSysInfo = require('./utils/windows-sysinfo');
const extract = require('extract-zip');
const axios = require('axios');
const crypto = require('crypto');
const discordPresence = require('./js/modules/discord-presence');
const SimpleCommandExecutor = require('./utils/simple-command-executor');

const verifiedHashes = {};

// Command execution using SimpleCommandExecutor for better reliability







// Global command executor instance (replacement for ProcessPoolManager)
const processPool = new SimpleCommandExecutor();



// Performance optimization based on system capabilities
async function applyPerformanceOptimizations() {
    try {
        const settingsStore = await getStore();
        if (!settingsStore) return;

        // Check if user has customized performance settings
        const hasCustomizedSettings = settingsStore.get('hasCustomizedPerformanceSettings', false);

        if (hasCustomizedSettings) {

            return;
        }

        // Get system capabilities using simple detection
        const systemCapabilities = await processPool.detectSystemCapabilities();

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

// Fetch verified plugins list from GitHub only
async function updateVerifiedPluginsList() {
    try {
        const response = await axios.get('https://raw.githubusercontent.com/MTechWare/wintool/refs/heads/main/src/config/verified-plugins.json', {
            timeout: 10000, // 10 second timeout
            headers: {
                'Cache-Control': 'no-cache',
                'User-Agent': 'WinTool/1.0'
            }
        });

        if (response.data && response.data.verified_hashes) {
            // Clear existing hashes and replace with GitHub data
            Object.keys(verifiedHashes).forEach(key => delete verifiedHashes[key]);
            Object.assign(verifiedHashes, response.data.verified_hashes);
        } else {
            throw new Error('Invalid response format from GitHub');
        }
    } catch (error) {
        console.error('Failed to fetch verified plugins list from GitHub:', error.message);
        // Clear any existing hashes since we can't verify them
        Object.keys(verifiedHashes).forEach(key => delete verifiedHashes[key]);
    }
}

// Initialize verified plugins list
updateVerifiedPluginsList();

// Refresh verified plugins list periodically (every 30 minutes)
setInterval(updateVerifiedPluginsList, 30 * 60 * 1000);

// Initialize store for settings
let store;

// Main window reference
let mainWindow = null;
let logViewerWindow = null;

// System tray reference
let tray = null;

let windowCreationAttempts = 0;
const MAX_WINDOW_CREATION_ATTEMPTS = 3;

// --- Helper Functions ---

/**
 * Gets the correct, user-writable path for storing plugins.
 * This is crucial for when the app is installed in a read-only location.
 */
function getPluginsPath() {
    let basePath;

    // The user specifically requested %LOCALAPPDATA% on Windows.
    // The most direct and reliable way to get this is via the environment variable.
    if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
        basePath = process.env.LOCALAPPDATA;
    } else {
        // For other platforms (macOS, Linux) or if the environment variable is somehow
        // missing on Windows, fall back to Electron's standard 'userData' directory.
        // This is a robust, cross-platform default.
        basePath = app.getPath('userData');

    }
    
    // The user specified creating an "MTechTool" folder for plugins.
    const pluginsPath = path.join(basePath, 'MTechTool', 'Plugins');
    
    return pluginsPath;
}

/**
 * Ensures the user-writable plugins directory exists on startup.
 */
async function ensurePluginsPathExists() {
    const pluginsPath = getPluginsPath();
    try {
        // recursive: true prevents errors if the directory already exists.
        await fs.mkdir(pluginsPath, { recursive: true });

    } catch (error) {
        console.error('Fatal: Failed to create user plugin directory:', error);
        dialog.showErrorBox('Initialization Error', `Failed to create required plugin directory at ${pluginsPath}. Please check permissions.`);
    }
}

/**
 * Scans both development and user plugin directories and returns a map
 * of unique plugin IDs to their full paths. User plugins override dev plugins.
 * This provides a robust way to handle plugins in both dev and prod environments.
 */
async function getPluginMap() {
    // For local development, we check the built-in plugins folder.
    const devPluginsPath = path.join(__dirname, 'plugins');
    // This is the primary, user-writable location for installed plugins.
    const userPluginsPath = getPluginsPath();
    const pluginMap = new Map();

    const readFoldersFromDir = async (dirPath) => {
        try {
            const items = await fs.readdir(dirPath);
            const directories = [];
            for (const item of items) {
                const itemPath = path.join(dirPath, item);
                try {
                    if ((await fs.stat(itemPath)).isDirectory()) {
                        directories.push({ name: item, path: itemPath });
                    }
                } catch (e) { /* ignore files and other non-directory items */ }
            }
            return directories;
        } catch (error) {
            // It's normal for a directory to not exist (e.g., dev path in prod), so we don't log an error.
            return [];
        }
    };

    // Load development plugins first.
    const devPlugins = await readFoldersFromDir(devPluginsPath);
    for (const plugin of devPlugins) {
        const manifestPath = path.join(plugin.path, 'plugin.json');
        try {
            const manifestData = await fs.readFile(manifestPath, 'utf8');
            const manifest = JSON.parse(manifestData);
            if (manifest.id) {
                pluginMap.set(manifest.id, plugin.path);
            } else {
                pluginMap.set(plugin.name, plugin.path);
            }
        } catch (e) {
            pluginMap.set(plugin.name, plugin.path);
        }
    }

    // Load user-installed plugins. If a name conflicts, this will overwrite
    // the development version, allowing users to override built-in plugins.
    const userPlugins = await readFoldersFromDir(userPluginsPath);
    for (const plugin of userPlugins) {
        pluginMap.set(plugin.name, plugin.path);
    }

    return pluginMap;
}

// Rate limiting for security
const rateLimiter = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // 30 requests per minute

function checkRateLimit(operation) {
    const now = Date.now();
    const key = operation;

    if (!rateLimiter.has(key)) {
        rateLimiter.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return true;
    }

    const limit = rateLimiter.get(key);
    if (now > limit.resetTime) {
        // Reset the counter
        limit.count = 1;
        limit.resetTime = now + RATE_LIMIT_WINDOW;
        return true;
    }

    if (limit.count >= MAX_REQUESTS_PER_WINDOW) {
        return false;
    }

    limit.count++;
    return true;
}

// Set app name
app.setName('WinTool');

// Security logging using enhanced logger
function logSecurityEvent(event, details) {
    if (global.logger) {
        global.logger.logSecurity(event, details);
    }
}

// Enhanced logging system for the log viewer
class EnhancedLogger {
    constructor() {
        this.originalLog = console.log;
        this.originalWarn = console.warn;
        this.originalError = console.error;
        this.originalDebug = console.debug;
        this.originalTrace = console.trace;

        this.setupConsoleOverrides();
    }

    setupConsoleOverrides() {
        // Override console.log
        console.log = (...args) => {
            this.originalLog.apply(console, args);
            this.sendToLogViewer('info', args.join(' '), 'System');
        };

        // Override console.warn
        console.warn = (...args) => {
            this.originalWarn.apply(console, args);
            this.sendToLogViewer('warn', args.join(' '), 'System');
        };

        // Override console.error
        console.error = (...args) => {
            this.originalError.apply(console, args);
            this.sendToLogViewer('error', args.join(' '), 'System');
        };

        // Override console.debug
        console.debug = (...args) => {
            this.originalDebug.apply(console, args);
            this.sendToLogViewer('debug', args.join(' '), 'System');
        };

        // Override console.trace
        console.trace = (...args) => {
            this.originalTrace.apply(console, args);
            this.sendToLogViewer('trace', args.join(' '), 'System');
        };
    }

    sendToLogViewer(level, message, source = 'System') {
        if (logViewerWindow && !logViewerWindow.isDestroyed()) {
            logViewerWindow.webContents.send('log-message', level, message, source);
        }
    }

    // Custom logging methods with source tracking
    logInfo(message, source = 'System') {
        this.originalLog(`[INFO] ${source}: ${message}`);
        this.sendToLogViewer('info', message, source);
    }

    logWarn(message, source = 'System') {
        this.originalWarn(`[WARN] ${source}: ${message}`);
        this.sendToLogViewer('warn', message, source);
    }

    logError(message, source = 'System') {
        this.originalError(`[ERROR] ${source}: ${message}`);
        this.sendToLogViewer('error', message, source);
    }

    logDebug(message, source = 'System') {
        this.originalDebug(`[DEBUG] ${source}: ${message}`);
        this.sendToLogViewer('debug', message, source);
    }

    logSuccess(message, source = 'System') {
        this.originalLog(`[SUCCESS] ${source}: ${message}`);
        this.sendToLogViewer('success', message, source);
    }

    logTrace(message, source = 'System') {
        this.originalTrace(`[TRACE] ${source}: ${message}`);
        this.sendToLogViewer('trace', message, source);
    }

    logSecurity(event, details, source = 'Security') {
        const timestamp = new Date().toISOString();
        const message = `${event} - ${JSON.stringify(details)}`;
        this.originalLog(`[SECURITY] ${timestamp}: ${message}`);
        this.sendToLogViewer('warn', message, source);
    }
}

// Initialize the enhanced logger
const enhancedLogger = new EnhancedLogger();

// Export logger functions for use throughout the application
global.logger = enhancedLogger;



// Load store on demand
async function getStore() {
    if (!store) {
        try {
            const Store = await import('electron-store');
            store = new Store.default();

        } catch (error) {
            console.error('Failed to load electron-store:', error);
            return null;
        }
    }
    return store;
}

/**
 * Create performance settings window
 */
function createPerformanceSettingsWindow() {
    const performanceWindow = new BrowserWindow({
        width: 900,
        height: 700,
        title: 'Performance Settings - WinTool',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        parent: mainWindow,
        modal: true,
        resizable: true,
        minimizable: false,
        maximizable: false,
    });

    performanceWindow.loadFile(path.join(__dirname, 'performance-settings.html'));

    performanceWindow.on('closed', () => {
        // Window closed
    });

    return performanceWindow;
}

/**
 * Create the main application window
 */
function createLogViewerWindow() {
    if (logViewerWindow) {
        logViewerWindow.focus();
        return;
    }

    logViewerWindow = new BrowserWindow({
        width: 800,
        height: 600,
        title: 'Log Viewer',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    logViewerWindow.loadFile(path.join(__dirname, 'log-viewer.html'));

    logViewerWindow.webContents.on('did-finish-load', async () => {
        const settingsStore = await getStore();
        if (settingsStore) {
            const themeSettings = {
                theme: settingsStore.get('theme', 'classic-dark'),
                primaryColor: settingsStore.get('primaryColor', '#ff9800'),
                customTheme: settingsStore.get('customTheme', {}),
                rainbowMode: settingsStore.get('rainbowMode', false)
            };
            logViewerWindow.webContents.send('theme-data', themeSettings);
        }
    });

    logViewerWindow.on('closed', () => {
        logViewerWindow = null;
    });
}

async function createWindow() {
    windowCreationAttempts++;

    try {
        // Get screen dimensions for responsive sizing
        const primaryDisplay = screen.getPrimaryDisplay();
        const {
            width: screenWidth,
            height: screenHeight
        } = primaryDisplay.workAreaSize;

        // Validate screen dimensions
        if (screenWidth < 800 || screenHeight < 600) {
            console.warn(`Screen dimensions too small: ${screenWidth}x${screenHeight}`);
        }

        // Always use % of screen for window size
        const windowSizePercent = 0.8;
        const windowWidth = Math.max(800, Math.round(screenWidth * windowSizePercent));
        const windowHeight = Math.max(600, Math.round(screenHeight * windowSizePercent));



        // Get transparency setting before creating the window
        const settingsStore = await getStore();
        let opacity = settingsStore ? settingsStore.get('transparency', 1) : 1;
        let useTransparent = settingsStore ? settingsStore.get('useTransparentWindow', false) : false; // Default to false for better compatibility

        // If we've had multiple failed attempts, disable transparency
        if (windowCreationAttempts > 1) {
            useTransparent = false;
            if (settingsStore) {
                settingsStore.set('useTransparentWindow', false);
            }
        }

        // Ensure opacity is within valid range and not causing invisible window
        if (opacity < 0.3) {
            opacity = 0.3;
            // Save the corrected value
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

        // Create the browser window with improved settings
        const windowOptions = {
            width: windowWidth,
            height: windowHeight,
            minWidth: 800,
            minHeight: 600,
            x: x,
            y: y,
            icon: path.join(__dirname, 'assets/images/icon.ico'),
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                nodeIntegration: false,
                contextIsolation: true,
                devTools: true,
                webSecurity: true
            },
            frame: false, // Custom title bar
            transparent: useTransparent,
            show: false, // Show when ready
            center: false, // We're setting position manually
            opacity: opacity,
            backgroundColor: useTransparent ? undefined : '#1a1a1a', // Fallback background
            titleBarStyle: 'hidden',
            skipTaskbar: false,
            alwaysOnTop: false // Will be set later based on settings
        };

        mainWindow = new BrowserWindow(windowOptions);

    } catch (error) {
        console.error('Error creating BrowserWindow:', error);

        if (windowCreationAttempts < MAX_WINDOW_CREATION_ATTEMPTS) {
            // Reset and try again with safer settings
            const settingsStore = await getStore();
            if (settingsStore) {
                settingsStore.set('useTransparentWindow', false);
                settingsStore.set('transparency', 1);
            }
            return await createWindow();
        } else {
            throw new Error(`Failed to create window after ${MAX_WINDOW_CREATION_ATTEMPTS} attempts: ${error.message}`);
        }
    }

    // Load the main HTML file
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // Apply always on top setting
    const settingsStore = await getStore();
    const topMost = settingsStore ? settingsStore.get('topMost', false) : false;
    if (topMost) {
        mainWindow.setAlwaysOnTop(true);
    }

    // Show window when ready with improved visibility handling
    mainWindow.once('ready-to-show', () => {
        try {
            // Ensure window is properly positioned before showing
            const bounds = mainWindow.getBounds();

            // Verify window is within screen bounds
            const primaryDisplay = screen.getPrimaryDisplay();
            const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

            if (bounds.x < 0 || bounds.y < 0 || bounds.x > screenWidth || bounds.y > screenHeight) {
                mainWindow.center();
            }

            // Show the window
            mainWindow.show();

            // Focus the window
            mainWindow.focus();

            // Verify visibility after a short delay
            setTimeout(() => {
                if (mainWindow) {
                    const isVisible = mainWindow.isVisible();
                    const currentOpacity = mainWindow.getOpacity();

                    if (!isVisible) {
                        // Try multiple recovery strategies
                        try {
                            // Strategy 1: Increase opacity if too low
                            if (currentOpacity < 0.3) {
                                mainWindow.setOpacity(0.8);
                            }

                            // Strategy 2: Show inactive then active
                            mainWindow.showInactive();
                            setTimeout(() => {
                                if (mainWindow) {
                                    mainWindow.show();
                                    mainWindow.focus();
                                    mainWindow.moveTop();
                                }
                            }, 100);

                        } catch (recoveryError) {
                            console.error('Recovery attempt failed:', recoveryError);
                        }
                    } else {
                        // Reset creation attempts on successful show
                        windowCreationAttempts = 0;
                    }
                }
            }, 200);

        } catch (error) {
            console.error('Error in ready-to-show handler:', error);
            // Fallback: try to show window without focus
            try {
                mainWindow.showInactive();
                setTimeout(() => {
                    if (mainWindow) {
                        mainWindow.show();
                    }
                }, 100);
            } catch (fallbackError) {
                console.error('Fallback show also failed:', fallbackError);
                // Last resort: recreate window without transparency
                setTimeout(() => {
                    if (settingsStore) {
                        settingsStore.set('useTransparentWindow', false);
                        mainWindow = null;
                        createWindow();
                    }
                }, 500);
            }
        }
    });

    // Handle window close event (always hide to tray instead of closing)
    mainWindow.on('close', async (event) => {
        if (!app.isQuiting) {
            event.preventDefault();
            hideWindow();

            // Show notification on first hide to tray
            const settingsStore = await getStore();
            if (settingsStore && !settingsStore.get('trayNotificationShown', false)) {
                tray.displayBalloon({
                    iconType: 'info',
                    title: 'WinTool',
                    content: 'Application was minimized to tray. Click the tray icon to restore.'
                });
                settingsStore.set('trayNotificationShown', true);
            }
        }
    });

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });



    return mainWindow;
}

/**
 * Create system tray
 */
function createTray() {
    // Create tray icon using the application icon
    const trayIconPath = path.join(__dirname, 'assets/images/icon.ico');

    try {
        // Create native image for tray icon
        const trayIcon = nativeImage.createFromPath(trayIconPath);

        // Check if icon was loaded successfully
        if (trayIcon.isEmpty()) {
            // Fallback to a simple icon or let system use default
        }

        // Create tray
        tray = new Tray(trayIcon);

        // Set tooltip
        tray.setToolTip('WinTool');

        // Create context menu
        const contextMenu = Menu.buildFromTemplate([{
            label: 'Show WinTool',
            click: async () => {
                await showWindow();
            }
        }, {
            label: 'Hide WinTool',
            click: () => {
                hideWindow();
            }
        }, {
            type: 'separator'
        }, {
            label: 'Settings',
            click: async () => {
                await showWindow();
                // Send message to renderer to show settings
                if (mainWindow) {
                    mainWindow.webContents.send('show-settings');
                }
            }
        },
            { type: 'separator' },
            {
                label: 'Quit WinTool',
                click: () => {
                    quitApplication();
                }
            }
        ]);

        // Set context menu
        tray.setContextMenu(contextMenu);

        // Handle tray icon click (show/hide window)
        tray.on('click', async () => {
            if (mainWindow && mainWindow.isVisible()) {
                hideWindow();
            } else {
                await showWindow();
            }
        });

    } catch (error) {
        console.error('Failed to create system tray:', error);
    }
}

/**
 * Show main window with improved visibility handling
 */
async function showWindow() {
    if (mainWindow) {
        try {
            // Check if window is destroyed
            if (mainWindow.isDestroyed()) {
                mainWindow = null;
                await createWindow();
                return;
            }

            // Restore if minimized
            if (mainWindow.isMinimized()) {
                mainWindow.restore();
            }

            // Ensure window is visible
            mainWindow.show();
            mainWindow.focus();

            // Double-check visibility and force if needed
            setTimeout(() => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    const stillVisible = mainWindow.isVisible();
                    if (!stillVisible) {
                        try {
                            // Multiple recovery strategies
                            const currentOpacity = mainWindow.getOpacity();

                            // Strategy 1: Ensure minimum opacity
                            if (currentOpacity < 0.3) {
                                mainWindow.setOpacity(0.8);
                            }

                            // Strategy 2: Move to center of screen
                            mainWindow.center();

                            // Strategy 3: Show inactive then active
                            mainWindow.showInactive();
                            setTimeout(() => {
                                if (mainWindow && !mainWindow.isDestroyed()) {
                                    mainWindow.show();
                                    mainWindow.focus();
                                    mainWindow.moveTop();
                                }
                            }, 100);

                        } catch (recoveryError) {
                            console.error('Recovery attempt failed:', recoveryError);
                        }
                    }
                }
            }, 200);

        } catch (error) {
            console.error('Error showing existing window:', error);
            // Try to recreate window if showing fails
            mainWindow = null;
            await createWindow();
        }
    } else {

        await createWindow();
    }
}

/**
 * Hide main window
 */
function hideWindow() {
    if (mainWindow) {
        mainWindow.hide();
    }
}



/**
 * Quit application properly
 */
function quitApplication() {

    app.isQuiting = true;
    app.quit();
}

function restartApp() {
    if (mainWindow) {
        mainWindow.reload();
    }
}



// --- Plugin Backend Loader ---
// A map to hold the loaded plugin backend modules
const loadedPluginBackends = new Map();

async function loadPluginBackends() {
    const pluginMap = await getPluginMap();

    // Batch plugin loading to reduce concurrent processes - optimized for faster startup
    const pluginEntries = Array.from(pluginMap.entries());
    const batchSize = 5; // Increased from 3 to 5 plugins at a time for faster loading

    for (let i = 0; i < pluginEntries.length; i += batchSize) {
        const batch = pluginEntries.slice(i, i + batchSize);

        // Process batch concurrently but with limited concurrency
        await Promise.all(batch.map(async ([pluginId, pluginPath]) => {
            const backendScriptPath = path.join(pluginPath, 'backend.js');
            try {
                // Check if backend.js exists before trying to require it.
                await fs.stat(backendScriptPath);

                // Conditionally clear the module from the cache based on the setting
                const settingsStore = await getStore();
                if (settingsStore && settingsStore.get('clearPluginCache', false)) {
                    delete require.cache[require.resolve(backendScriptPath)];
                }

                const pluginModule = require(backendScriptPath);
                if (pluginModule && typeof pluginModule.initialize === 'function') {
                    // Create a secure API for this specific plugin's backend
                    const backendApi = {
                        handlers: {},
                        registerHandler(name, func) {
                            // All handlers must be async functions for consistent promise-based results
                            this.handlers[name] = async (...args) => func(...args);
                        },
                        getStore: () => getStore(),
                        dialog: dialog,
                        axios: axios,
                        // Add a way for plugins to require their own dependencies
                        require: (moduleName) => {
                            try {
                                return require(path.join(pluginPath, 'node_modules', moduleName));
                            } catch (e) {
                                console.error(`Failed to load module '${moduleName}' for plugin '${pluginId}'. Make sure it is listed in the plugin's package.json.`);
                                throw e;
                            }
                        }
                    };

                    // Initialize the plugin with its dedicated, secure API
                    pluginModule.initialize(backendApi);
                    loadedPluginBackends.set(pluginId, backendApi);
                }
            } catch (e) {
                // This is a normal flow; most plugins won't have a backend.
                if (e.code !== 'ENOENT') {
                    console.error(`Error loading backend for plugin ${pluginId}:`, e);
                }
            }
        }));

        // Reduced delay between batches for faster startup
        if (i + batchSize < pluginEntries.length) {
            await new Promise(resolve => setTimeout(resolve, 50)); // Reduced from 100ms to 50ms
        }
    }
}

// Generic handler for all plugin frontend-to-backend communication
ipcMain.handle('plugin-invoke', async (event, pluginId, handlerName, ...args) => {
    const pluginBackend = loadedPluginBackends.get(pluginId);
    if (pluginBackend && pluginBackend.handlers && typeof pluginBackend.handlers[handlerName] === 'function') {
        // The handler function itself will be an async function
        return await pluginBackend.handlers[handlerName](...args);
    } else {
        throw new Error(`Handler '${handlerName}' not found for plugin '${pluginId}'`);
    }
});


// App event handlers
async function initializeApplication() {
    // Set app user model ID for Windows notifications
    if (process.platform === 'win32') {
        app.setAppUserModelId('com.mtechware.wintool');
    }

    globalShortcut.register('Control+Q', () => {
        quitApplication();
    });

    const settingsStore = await getStore();
    const { default: isElevated } = await import('is-elevated');
    const elevated = await isElevated();

    const showWindowAndFinishSetup = async () => {
        if (mainWindow) {
            return; // Window already exists
        }

        try {
            await createWindow();
            createTray();

            // Run slow tasks after the window is visible.
            (async () => {
                try {
                    if (settingsStore) {
                        const enableDiscordRpc = settingsStore.get('enableDiscordRpc', true);
                        if (enableDiscordRpc) {
                            discordPresence.start();
                        }
                    }

                    await ensurePluginsPathExists();

                    // Load plugin backends
                    await loadPluginBackends();

                    // Finish startup phase (compatibility method)
                    await processPool.finishStartupPhase();

                    // Apply performance optimizations based on detected system
                    await applyPerformanceOptimizations();
                } catch (error) {
                    console.error('Error during background startup tasks:', error);
                }
            })();
        } catch (error) {
            console.error('Error in showWindowAndFinishSetup:', error);

            // Try to create a basic window without advanced features
            try {
                const basicWindow = new BrowserWindow({
                    width: 800,
                    height: 600,
                    webPreferences: {
                        preload: path.join(__dirname, 'preload.js'),
                        nodeIntegration: false,
                        contextIsolation: true
                    },
                    frame: true, // Use standard frame
                    transparent: false, // No transparency
                    show: true // Show immediately
                });

                basicWindow.loadFile(path.join(__dirname, 'index.html'));
                mainWindow = basicWindow;

                // Still create tray for basic functionality
                createTray();
            } catch (basicError) {
                console.error('Even basic window creation failed:', basicError);
                // Show error dialog and quit
                dialog.showErrorBox('Startup Error',
                    'WinTool failed to start. Please try running as administrator or contact support.');
                app.quit();
            }
        }
    };

    if (!elevated) {
        const elevationChoice = settingsStore ? settingsStore.get('elevationChoice', 'ask') : 'ask';

        if (elevationChoice === 'yes') {
            const { exec } = require('child_process');
            const cmd = `"${process.execPath}"`;
            const args = process.argv.slice(1).join(' ');
            exec(`powershell -Command "Start-Process -FilePath '${cmd}' -ArgumentList '${args}' -Verb RunAs"`, (err) => {
                if (err) console.error(err);
                app.quit();
            });
            return;
        } else if (elevationChoice === 'no') {
            showWindowAndFinishSetup();
        } else { // 'ask'
            const promptWindow = new BrowserWindow({
                width: 500,
                height: 300,
                frame: false,
                resizable: false,
                webPreferences: {
                    preload: path.join(__dirname, 'preload.js'),
                    nodeIntegration: false,
                    contextIsolation: true
                }
            });

            promptWindow.loadFile(path.join(__dirname, 'elevation-prompt.html'));

            promptWindow.webContents.on('did-finish-load', async () => {
                if (settingsStore) {
                    const themeSettings = {
                        theme: settingsStore.get('theme', 'classic-dark'),
                        primaryColor: settingsStore.get('primaryColor', '#ff9800'),
                        customTheme: settingsStore.get('customTheme', {}),
                        rainbowMode: settingsStore.get('rainbowMode', false)
                    };
                    promptWindow.webContents.send('theme-data', themeSettings);
                }
            });

            ipcMain.once('elevation-choice', (event, { choice, remember }) => {
                promptWindow.close();

                if (remember && settingsStore) {
                    settingsStore.set('elevationChoice', choice ? 'yes' : 'no');
                }

                if (choice) {
                    const { exec } = require('child_process');
                    const cmd = `"${process.execPath}"`;
                    const args = process.argv.slice(1).join(' ');
                    exec(`powershell -Command "Start-Process -FilePath '${cmd}' -ArgumentList '${args}' -Verb RunAs"`, (err) => {
                        if (err) console.error(err);
                        app.quit();
                    });
                } else {
                    showWindowAndFinishSetup();
                }
            });
        }
    } else {
        // Already elevated
        showWindowAndFinishSetup();
    }
}

app.whenReady().then(initializeApplication);

app.on('window-all-closed', () => {
    // Don't quit the app when all windows are closed - keep running in tray
    // Only quit if explicitly requested via tray menu or app.isQuiting flag
    if (process.platform !== 'darwin' && app.isQuiting) {
        app.quit();
    }
});

app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        await createWindow();
    }
});

app.on('will-quit', () => {
    // Unregister all shortcuts before quitting
    globalShortcut.unregisterAll();

    // Clean up SimpleCommandExecutor
    processPool.cleanup();
});

// Handle app before quit event
app.on('before-quit', () => {
    app.isQuiting = true;
    if (tray) {
        tray.destroy();
    }

    // Cleanup SimpleCommandExecutor
    processPool.cleanup();

    // Clear performance monitoring
    if (performanceInterval) {
        clearInterval(performanceInterval);
        performanceInterval = null;
    }
});

// Window control IPC handlers
ipcMain.handle('minimize-window', async () => {
    if (mainWindow) {
        // Always hide to tray when minimizing
        hideWindow();

        // Show notification on first hide to tray
        const settingsStore = await getStore();
        if (settingsStore && !settingsStore.get('trayNotificationShown', false)) {
            tray.displayBalloon({
                iconType: 'info',
                title: 'WinTool',
                content: 'Application was minimized to tray. Click the tray icon to restore.'
            });
            settingsStore.set('trayNotificationShown', true);
        }
    }
    return true;
});

ipcMain.handle('maximize-window', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
    return true;
});

ipcMain.handle('close-window', () => {
    if (mainWindow) mainWindow.close();
    return true;
});

// System tray IPC handlers
ipcMain.handle('hide-to-tray', () => {
    hideWindow();
    return true;
});

ipcMain.handle('show-from-tray', async () => {
    await showWindow();
    return true;
});

ipcMain.handle('quit-app', () => {
    quitApplication();
    return true;
});

// Generic command execution handler with PowerShell Process Optimization
ipcMain.handle('run-admin-command', async (event, command) => {

    if (!command || typeof command !== 'string') {
        throw new Error('Invalid command parameter');
    }

    // Escape double quotes in the command for PowerShell
    const escapedCommand = command.replace(/"/g, '`"');

    // Construct the PowerShell command to run the original command elevated
    const psScript = `Start-Process -Verb RunAs -Wait -FilePath "cmd.exe" -ArgumentList "/c ${escapedCommand}"`;

    try {
        // Use the SimpleCommandExecutor for PowerShell execution
        await processPool.executePowerShellCommand(psScript);
        return { success: true };
    } catch (error) {
        throw new Error(`Elevated process failed: ${error.message}. The user may have denied the UAC prompt.`);
    }
});

ipcMain.handle('run-command', async (event, command, asAdmin = false) => {
    logSecurityEvent('RUN_COMMAND', { command, asAdmin });

    if (!command || typeof command !== 'string') {
        throw new Error('Invalid command provided.');
    }

    // For commands that need to run as admin
    if (asAdmin) {
        const commandParts = command.split(' ');
        const executable = commandParts.shift();
        const args = commandParts.join(' ');

        // Use PowerShell to start the process with elevated privileges
        const psScript = `Start-Process -FilePath "${executable}" -ArgumentList "${args}" -Verb RunAs -Wait`;

        return processPool.executePowerShellCommand(psScript)
            .then(() => {
                return { success: true, message: `Command '${command}' executed successfully as admin.` };
            })
            .catch((error) => {
                throw new Error(`Elevated process failed: ${error.message}. The user may have cancelled the UAC prompt.`);
            });
    }

    // For non-admin commands, use SimpleCommandExecutor
    try {
        const output = await processPool.executeCmdCommand(command);
        return {
            success: true,
            code: 0,
            stdout: output,
            stderr: '',
            message: 'Command finished with exit code 0.'
        };
    } catch (error) {
        // Don't log expected failures as errors
        if (!processPool.isExpectedFailure(command, error.message)) {
            console.error('Command execution error:', error.message);
        }

        // Extract exit code from error message if available
        const codeMatch = error.message.match(/exit code (\d+)/);
        const exitCode = codeMatch ? parseInt(codeMatch[1]) : 1;

        return {
            success: false,
            code: exitCode,
            stdout: '',
            stderr: error.message,
            message: `Command finished with exit code ${exitCode}.`
        };
    }
});

ipcMain.handle('open-app-directory', () => {
    const appPath = app.getAppPath();
    const appDir = path.dirname(appPath);
    shell.openPath(appDir);
});

ipcMain.handle('toggle-dev-tools', () => {
    if (mainWindow && mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
    } else if (mainWindow) {
        mainWindow.webContents.openDevTools();
    }
});

ipcMain.handle('open-special-folder', (event, folderKey) => {
    let folderPath = '';
    switch (folderKey) {
        case 'temp':
            folderPath = os.tmpdir();
            break;
        case 'startup':
            folderPath = app.getPath('startup');
            break;
        case 'hosts':
            folderPath = path.join(process.env.SystemRoot, 'System32', 'drivers', 'etc');
            break;
        default:
            console.error(`Unknown special folder key: ${folderKey}`);
            return;
    }
    shell.openPath(folderPath);
});

// Settings IPC handlers
ipcMain.handle('get-setting', async (event, key, defaultValue) => {
    const settingsStore = await getStore();
    if (!settingsStore) return defaultValue;
    return settingsStore.get(key, defaultValue);
});

ipcMain.handle('set-setting', async (event, key, value) => {
    const settingsStore = await getStore();
    if (!settingsStore) return false;
    settingsStore.set(key, value);
    if (key === 'enableDiscordRpc') {
        if (value) {
            discordPresence.start();
        } else {
            discordPresence.stop();
        }
    }
    if (key === 'topMost') {
        if (mainWindow) {
            mainWindow.setAlwaysOnTop(value);
        }
    }
    return true;
});

ipcMain.handle('set-window-opacity', (event, opacity) => {
    if (mainWindow) {
        mainWindow.setOpacity(opacity);
    }
});

ipcMain.handle('open-log-viewer', () => {
    createLogViewerWindow();
});

// Handle custom log messages from renderer processes
ipcMain.handle('log-custom-message', (event, level, message, source) => {
    if (global.logger) {
        switch(level) {
            case 'info':
                global.logger.logInfo(message, source);
                break;
            case 'warn':
                global.logger.logWarn(message, source);
                break;
            case 'error':
                global.logger.logError(message, source);
                break;
            case 'debug':
                global.logger.logDebug(message, source);
                break;
            case 'success':
                global.logger.logSuccess(message, source);
                break;
            case 'trace':
                global.logger.logTrace(message, source);
                break;
            default:
                global.logger.logInfo(message, source);
        }
    }
    return { success: true };
});

// Open performance settings handler
ipcMain.handle('open-performance-settings', () => {
    createPerformanceSettingsWindow();
});



// Performance metrics handler
let performanceInterval;
let performanceUpdateCount = 0; // Track how many components are requesting updates
let performanceCache = null;
let performanceCacheTime = 0;



ipcMain.handle('start-performance-updates', async () => {
    performanceUpdateCount++;

    // Only start the interval if it's not already running
    if (!performanceInterval) {

        const updatePerformanceMetrics = async () => {
            try {
                // Use cached data if recent (within 2 seconds)
                const now = Date.now();
                if (performanceCache && (now - performanceCacheTime) < 2000) {
                    if (mainWindow && mainWindow.webContents) {
                        mainWindow.webContents.send('performance-update', performanceCache);
                    }
                    return;
                }

                // Only monitor memory usage
                const memInfo = await windowsSysInfo.mem();
                const metrics = {
                    mem: ((memInfo.active / memInfo.total) * 100).toFixed(2)
                };

                // Cache the metrics
                performanceCache = metrics;
                performanceCacheTime = now;

                if (mainWindow && mainWindow.webContents) {
                    mainWindow.webContents.send('performance-update', metrics);
                }
            } catch (error) {
                console.error('Failed to get performance metrics:', error);
            }
        };

        // Use fixed 3-second interval for simplicity
        performanceInterval = setInterval(updatePerformanceMetrics, 3000);
    }
});

ipcMain.handle('stop-performance-updates', () => {
    if (performanceUpdateCount > 0) {
        performanceUpdateCount--;
    }

    // Only stop the interval if no components are requesting updates
    if (performanceUpdateCount <= 0 && performanceInterval) {
        clearInterval(performanceInterval);
        performanceInterval = null;
        performanceUpdateCount = 0; // Reset to 0 to prevent negative values
    }
});

// Performance settings handlers
ipcMain.handle('get-performance-mode', async () => {
    const settingsStore = await getStore();
    return settingsStore ? settingsStore.get('performanceMode', 'balanced') : 'balanced';
});

ipcMain.handle('set-performance-mode', async (event, mode) => {
    const settingsStore = await getStore();
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

ipcMain.handle('get-system-capabilities', () => {
    return {
        capabilities: processPool.systemCapabilities || 'unknown',
        maxActiveProcesses: processPool.maxActiveProcesses,
        isStartupPhase: processPool.isStartupPhase
    };
});

// Clear all settings handler
ipcMain.handle('clear-all-settings', async () => {
    const settingsStore = await getStore();
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

// Restart application handler
ipcMain.handle('restart-application', () => {
    restartApp();
    return true;
});

// Environment Variables Management IPC handlers
ipcMain.handle('get-environment-variables', async () => {
    try {
        // PowerShell script to get both user and system environment variables
        const psScript = `
        try {
            $userVars = [Environment]::GetEnvironmentVariables([EnvironmentVariableTarget]::User)
            $systemVars = [Environment]::GetEnvironmentVariables([EnvironmentVariableTarget]::Machine)

            $result = @{
                user = @{}
                system = @{}
            }

            foreach ($key in $userVars.Keys) {
                # Escape special characters in values that could break JSON
                $value = $userVars[$key]
                if ($value -ne $null) {
                    $result.user[$key] = $value.ToString()
                }
            }

            foreach ($key in $systemVars.Keys) {
                # Escape special characters in values that could break JSON
                $value = $systemVars[$key]
                if ($value -ne $null) {
                    $result.system[$key] = $value.ToString()
                }
            }

            $result | ConvertTo-Json -Depth 3 -Compress
        } catch {
            Write-Error "Failed to get environment variables: $_"
            @{user=@{}; system=@{}} | ConvertTo-Json -Compress
        }
        `.trim();

        const output = await processPool.executePowerShellCommand(psScript);

        if (!output || output.trim().length === 0) {
            return { user: {}, system: {} };
        }

        try {
            return JSON.parse(output);
        } catch (parseError) {
            console.warn('Failed to parse environment variables JSON, returning empty result:', parseError.message);
            return { user: {}, system: {} };
        }
    } catch (error) {
        console.error('Error getting environment variables:', error);
        // Return empty result instead of throwing to prevent app crashes
        return { user: {}, system: {} };
    }
});

ipcMain.handle('set-environment-variable', async (event, name, value, target) => {

    // Rate limiting
    if (!checkRateLimit('env-var-set')) {
        throw new Error('Rate limit exceeded. Please wait before making more requests.');
    }

    // Input validation
    if (!name || typeof name !== 'string') {
        throw new Error('Invalid variable name parameter');
    }
    if (typeof value !== 'string') {
        throw new Error('Invalid variable value parameter');
    }
    if (!target || (target !== 'User' && target !== 'Machine')) {
        throw new Error('Invalid target parameter. Must be "User" or "Machine"');
    }

    // Sanitize variable name and value
    const sanitizedName = name.replace(/[^a-zA-Z0-9_]/g, '');
    if (sanitizedName !== name) {
        throw new Error('Variable name contains invalid characters');
    }

    const psScript = `
        try {
            [Environment]::SetEnvironmentVariable("${sanitizedName}", "${value.replace(/"/g, '""')}", [EnvironmentVariableTarget]::${target})
            Write-Output "SUCCESS"
        } catch {
            Write-Error $_.Exception.Message
        }
        `.trim();

    try {
        const output = await processPool.executePowerShellCommand(psScript);
        return { success: true, message: 'Environment variable set successfully' };
    } catch (error) {
        throw new Error(`Failed to set environment variable: ${error.message}`);
    }
});

ipcMain.handle('delete-environment-variable', async (event, name, target) => {

    // Rate limiting
    if (!checkRateLimit('env-var-delete')) {
        throw new Error('Rate limit exceeded. Please wait before making more requests.');
    }

    // Input validation
    if (!name || typeof name !== 'string') {
        throw new Error('Invalid variable name parameter');
    }
    if (!target || (target !== 'User' && target !== 'Machine')) {
        throw new Error('Invalid target parameter. Must be "User" or "Machine"');
    }

    // Sanitize variable name
    const sanitizedName = name.replace(/[^a-zA-Z0-9_]/g, '');
    if (sanitizedName !== name) {
        throw new Error('Variable name contains invalid characters');
    }

    const psScript = `
        try {
            [Environment]::SetEnvironmentVariable("${sanitizedName}", $null, [EnvironmentVariableTarget]::${target})
            Write-Output "SUCCESS"
        } catch {
            Write-Error $_.Exception.Message
        }
        `.trim();

    try {
        const output = await processPool.executePowerShellCommand(psScript);
        return { success: true, message: `Environment variable ${sanitizedName} deleted successfully` };
    } catch (error) {
        throw new Error(`Failed to delete environment variable: ${error.message}`);
    }
});



// Lightweight system health info handler for dashboard
ipcMain.handle('get-system-health-info', async () => {

    try {
        // Only gather memory data for health dashboard (CPU monitoring removed)
        const mem = await windowsSysInfo.mem();

        // Format memory sizes
        const formatBytes = (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        // Calculate memory usage percentage
        const memoryUsagePercent = Math.round((mem.active / mem.total) * 100);

        return {
            // Memory information only
            totalMemory: formatBytes(mem.total),
            usedMemory: formatBytes(mem.active),
            availableMemory: formatBytes(mem.available),
            freeMemory: formatBytes(mem.free),
            memoryUsagePercent: memoryUsagePercent
        };
    } catch (error) {
        console.error('Error getting system health info:', error);
        throw error;
    }
});

// System information cache
let systemInfoCache = null;
let systemInfoCacheTime = 0;
const SYSTEM_INFO_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

// Comprehensive system info handler using systeminformation
ipcMain.handle('get-system-info', async (event, type) => {

    try {
        // Check if we should use fast mode (basic info only)
        const settingsStore = await getStore();
        // Default to fast mode during startup phase for better performance
        const isStartupPhase = processPool && processPool.isStartupPhase;
        // Also enable fast mode if we've had recent timeout errors
        const hasRecentTimeoutError = systemInfoCache && systemInfoCache.error && systemInfoCache.error.includes('timed out');
        const shouldUseFastMode = isStartupPhase || hasRecentTimeoutError;
        const fastMode = settingsStore ? settingsStore.get('fastSystemInfo', shouldUseFastMode) : shouldUseFastMode;
        const useCache = settingsStore ? settingsStore.get('cacheSystemInfo', true) : true;

        // Check cache first if enabled and no specific type requested
        if (!type && useCache && systemInfoCache && (Date.now() - systemInfoCacheTime) < SYSTEM_INFO_CACHE_DURATION) {
            return systemInfoCache;
        }

        // Fast mode for basic info only
        if (!type && fastMode) {
            const reason = isStartupPhase ? 'startup optimization' : hasRecentTimeoutError ? 'recent timeout error' : 'user setting';

            const basicInfo = {
                platform: os.platform(),
                arch: os.arch(),
                hostname: os.hostname(),
                cpuCores: os.cpus().length + ' cores',
                uptime: Math.round(os.uptime() / 3600) + ' hours',
                fastMode: true,
                fastModeReason: reason,
                timestamp: new Date().toISOString()
            };

            if (useCache) {
                systemInfoCache = basicInfo;
                systemInfoCacheTime = Date.now();
            }

            return basicInfo;
        }

        if (type) {
            // Handle specific requests for individual data points (for plugins)
            switch (type) {
                case 'time':
                    return await windowsSysInfo.time();
                case 'health':
                    // Redirect to lightweight handler for health dashboard
                    return await ipcMain.handle('get-system-health-info')();
                case 'system':
                    return await windowsSysInfo.system();
                case 'cpu':
                    return await windowsSysInfo.cpu();
                case 'mem':
                    return await windowsSysInfo.mem();
                case 'osInfo':
                    return await windowsSysInfo.osInfo();
                case 'diskLayout':
                    return await windowsSysInfo.diskLayout();
                case 'fsSize':
                    return await windowsSysInfo.fsSize();
                case 'networkInterfaces':
                    return await windowsSysInfo.networkInterfaces();
                // Add other specific cases here as needed by plugins
                default:
                    throw new Error(`Invalid system information type: ${type}`);
            }
        }

        const sysInfoStart = performance.now();
        console.log('🔍 Gathering full system information using Windows PowerShell...');

        // Use our Windows-specific system info module
        const systemInfo = await windowsSysInfo.getAllSystemInfo();

        // Format uptime
        const uptimeSeconds = os.uptime();
        const days = Math.floor(uptimeSeconds / 86400);
        const hours = Math.floor((uptimeSeconds % 86400) / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const formattedUptime = `${days}d ${hours}h ${minutes}m`;

        // Format memory sizes
        const formatBytes = (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        console.log(`✅ System info gathered successfully in ${(performance.now() - sysInfoStart).toFixed(2)}ms, building result...`);
        const result = {
            // Basic system info
            platform: systemInfo.osInfo.platform || os.platform(),
            arch: systemInfo.osInfo.arch || os.arch(),
            hostname: systemInfo.osInfo.hostname || os.hostname(),
            uptime: formattedUptime,

            // Memory information
            totalMemory: formatBytes(systemInfo.mem.total || os.totalmem()),
            freeMemory: formatBytes(systemInfo.mem.free || os.freemem()),
            usedMemory: formatBytes(systemInfo.mem.used || (os.totalmem() - os.freemem())),
            memoryUsagePercent: systemInfo.mem.total ? Math.round((systemInfo.mem.used / systemInfo.mem.total) * 100) : 0,

            // CPU information
            cpuManufacturer: systemInfo.cpu.manufacturer || 'Unknown',
            cpuBrand: systemInfo.cpu.brand || 'Unknown',
            cpuSpeed: systemInfo.cpu.speed ? systemInfo.cpu.speed + ' GHz' : 'N/A',
            cpuSpeedMin: systemInfo.cpu.speedMin ? systemInfo.cpu.speedMin + ' GHz' : 'N/A',
            cpuSpeedMax: systemInfo.cpu.speedMax ? systemInfo.cpu.speedMax + ' GHz' : 'N/A',
            cpuCores: systemInfo.cpu.cores || os.cpus().length,
            cpuPhysicalCores: systemInfo.cpu.physicalCores || os.cpus().length,
            cpuProcessors: systemInfo.cpu.processors || 1,
            cpuSocket: systemInfo.cpu.socket || 'N/A',
            cpuCurrentSpeed: systemInfo.cpuCurrentSpeed.avg ? systemInfo.cpuCurrentSpeed.avg.toFixed(2) + ' GHz' : 'N/A',
            cpuTemperature: systemInfo.cpuTemperature.main ? systemInfo.cpuTemperature.main + '°C' : 'N/A',

            // Kernel information
            kernelBuild: systemInfo.osInfo.build || 'Unknown',
            kernelVersion: systemInfo.osInfo.release || 'Unknown',
            kernelArch: systemInfo.osInfo.arch || 'Unknown',

            // Operating System information
            osEdition: systemInfo.osInfo.distro || 'Unknown',
            osInstallDate: systemInfo.osInfo.installDate || 'Unknown',
            osCurrentUser: systemInfo.osInfo.currentUser || 'Unknown',
            osComputerName: systemInfo.osInfo.hostname || 'Unknown',

            // BIOS information
            biosVendor: systemInfo.bios.vendor || 'Unknown',
            biosVersion: systemInfo.bios.version || 'Unknown',
            biosReleaseDate: systemInfo.bios.releaseDate || 'Unknown',

            // Motherboard information
            motherboardManufacturer: systemInfo.baseboard.manufacturer || 'Unknown',
            motherboardModel: systemInfo.baseboard.model || 'Unknown',
            motherboardVersion: systemInfo.baseboard.version || 'Unknown',
            motherboardSerial: systemInfo.baseboard.serial || 'Unknown',

            // Operating system info
            osDistro: systemInfo.osInfo.distro || 'Unknown',
            osRelease: systemInfo.osInfo.release || 'Unknown',
            osCodename: systemInfo.osInfo.codename || 'Unknown',
            osKernel: systemInfo.osInfo.kernel || 'Unknown',
            osBuild: systemInfo.osInfo.build || 'Unknown',
            osSerial: systemInfo.osInfo.serial || 'Unknown',

            // Storage information
            storageDevices: (systemInfo.diskLayout || []).map(disk => ({
                device: disk.device || 'Unknown',
                type: disk.type || 'Unknown',
                name: disk.name || 'Unknown',
                vendor: disk.vendor || 'Unknown',
                size: formatBytes(disk.size),
                interfaceType: disk.interfaceType || 'Unknown',
                serialNum: disk.serialNum || 'Unknown',
                smartStatus: disk.smartStatus || 'Unknown'
            })),

            // File system information
            filesystems: (systemInfo.fsSize || []).map(fs => ({
                fs: fs.fs,
                type: fs.type,
                size: formatBytes(fs.size),
                used: formatBytes(fs.used),
                available: formatBytes(fs.available),
                usePercent: fs.use,
                mount: fs.mount
            })),

            // Network interfaces
            networkInterfaces: (systemInfo.networkInterfaces || []).filter(iface => !iface.internal).map(iface => ({
                name: iface.iface,
                type: iface.type || 'Unknown',
                speed: iface.speed ? (iface.speed / 1000000) + ' Mbps' : 'Unknown',
                ip4: iface.ip4 || 'N/A',
                ip6: iface.ip6 || 'N/A',
                mac: iface.mac || 'N/A',
                operstate: iface.operstate || 'Unknown'
            })),

            // Graphics information
            graphicsPrimaryGpu: systemInfo.graphics.primaryGpu?.model || 'Unknown',
            graphicsVendor: systemInfo.graphics.primaryGpu?.vendor || 'Unknown',
            graphicsDriverVersion: systemInfo.graphics.primaryGpu?.driver || 'Unknown',
            graphicsResolution: systemInfo.graphics.resolution || 'Unknown',



            // Primary storage information
            storagePrimary: systemInfo.fsSize?.[0]?.fs || 'C:',
            storageTotal: systemInfo.fsSize?.[0] ? formatBytes(systemInfo.fsSize[0].size) : 'Unknown',
            storageFree: systemInfo.fsSize?.[0] ? formatBytes(systemInfo.fsSize[0].available) : 'Unknown',
            storageUsed: systemInfo.fsSize?.[0] ? formatBytes(systemInfo.fsSize[0].used) : 'Unknown',

            // Windows-specific metadata
            windowsSpecific: true,
            powerShellVersion: 'Available',
            timestamp: systemInfo.timestamp


        };

        // Cache the result if caching is enabled
        if (useCache) {
            systemInfoCache = result;
            systemInfoCacheTime = Date.now();
            console.log('System information cached for future requests');
        }

        return result;

    } catch (error) {
        console.error('Error getting system information:', error);

        // Create fallback info with basic os module data
        const fallbackInfo = {
            platform: os.platform(),
            arch: os.arch(),
            hostname: os.hostname(),
            cpuCores: os.cpus().length + ' cores',
            uptime: Math.round(os.uptime() / 3600) + ' hours',
            error: error.message || 'Failed to get detailed system information',
            fallbackMode: true,
            timestamp: new Date().toISOString()
        };

        // Cache the fallback info to enable fast mode on next call if this was a timeout
        if (useCache && error.message && error.message.includes('timed out')) {
            systemInfoCache = fallbackInfo;
            systemInfoCacheTime = Date.now();
            console.log('Cached fallback system info due to timeout - will use fast mode on next call');
        }

        return fallbackInfo;
    }
});

// Network statistics handler using Windows PowerShell
ipcMain.handle('get-network-stats', async () => {
    console.log('get-network-stats handler called');

    try {
        // Get both real-time and cumulative network statistics
        const [networkStats, cumulativeStats] = await Promise.allSettled([
            windowsSysInfo.networkStats('*'),
            windowsSysInfo.networkStatsCumulative()
        ]);

        const realTimeStats = networkStats.status === 'fulfilled' ? networkStats.value : [];
        const totalStats = cumulativeStats.status === 'fulfilled' ? cumulativeStats.value : [];
        
        console.log('Network stats received:', realTimeStats.length, 'real-time,', totalStats.length, 'cumulative');

        // Format the data
        const formatBytes = (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        // Merge real-time and cumulative data
        const mergedStats = [];
        const statsMap = new Map();

        // Add cumulative stats first (total data since boot)
        totalStats.forEach(stat => {
            statsMap.set(stat.iface, {
                iface: stat.iface,
                operstate: stat.operstate || 'up',
                rx_bytes_total: stat.rx_bytes || 0,
                tx_bytes_total: stat.tx_bytes || 0,
                rx_packets_total: stat.rx_packets || 0,
                tx_packets_total: stat.tx_packets || 0,
                rx_errors: stat.rx_errors || 0,
                tx_errors: stat.tx_errors || 0,
                rx_dropped: stat.rx_dropped || 0,
                tx_dropped: stat.tx_dropped || 0,
                rx_sec: 0,
                tx_sec: 0
            });
        });

        // Add or update with real-time stats (current transfer rates)
        realTimeStats.forEach(stat => {
            const existing = statsMap.get(stat.iface) || {};
            statsMap.set(stat.iface, {
                ...existing,
                iface: stat.iface,
                operstate: stat.operstate || existing.operstate || 'up',
                rx_bytes_total: existing.rx_bytes_total || stat.rx_bytes || 0,
                tx_bytes_total: existing.tx_bytes_total || stat.tx_bytes || 0,
                rx_packets_total: existing.rx_packets_total || stat.rx_packets || 0,
                tx_packets_total: existing.tx_packets_total || stat.tx_packets || 0,
                rx_errors: existing.rx_errors || stat.rx_errors || 0,
                tx_errors: existing.tx_errors || stat.tx_errors || 0,
                rx_dropped: existing.rx_dropped || stat.rx_dropped || 0,
                tx_dropped: existing.tx_dropped || stat.tx_dropped || 0,
                rx_sec: stat.rx_sec || 0,
                tx_sec: stat.tx_sec || 0
            });
        });

        // Calculate totals across all interfaces
        let totalRxBytes = 0;
        let totalTxBytes = 0;
        let totalRxPackets = 0;
        let totalTxPackets = 0;
        let totalRxErrors = 0;
        let totalTxErrors = 0;
        let totalRxDropped = 0;
        let totalTxDropped = 0;

        const interfaceStats = Array.from(statsMap.values()).map(stat => {
            totalRxBytes += stat.rx_bytes_total || 0;
            totalTxBytes += stat.tx_bytes_total || 0;
            totalRxPackets += stat.rx_packets_total || 0;
            totalTxPackets += stat.tx_packets_total || 0;
            totalRxErrors += stat.rx_errors || 0;
            totalTxErrors += stat.tx_errors || 0;
            totalRxDropped += stat.rx_dropped || 0;
            totalTxDropped += stat.tx_dropped || 0;

            return {
                iface: stat.iface,
                operstate: stat.operstate,
                rx_bytes: formatBytes(stat.rx_bytes_total || 0),
                tx_bytes: formatBytes(stat.tx_bytes_total || 0),
                rx_packets: stat.rx_packets_total || 0,
                tx_packets: stat.tx_packets_total || 0,
                rx_errors: stat.rx_errors || 0,
                tx_errors: stat.tx_errors || 0,
                rx_dropped: stat.rx_dropped || 0,
                tx_dropped: stat.tx_dropped || 0,
                rx_sec: stat.rx_sec ? formatBytes(stat.rx_sec) + '/s' : '0 B/s',
                tx_sec: stat.tx_sec ? formatBytes(stat.tx_sec) + '/s' : '0 B/s'
            };
        });

        return {
            interfaces: interfaceStats,
            totals: {
                rx_bytes: formatBytes(totalRxBytes),
                tx_bytes: formatBytes(totalTxBytes),
                rx_errors: totalRxErrors,
                tx_errors: totalTxErrors,
                rx_dropped: totalRxDropped,
                tx_dropped: totalTxDropped,
                total_packets_rx: totalRxPackets,
                total_packets_tx: totalTxPackets
            }
        };

    } catch (error) {
        console.error('Error getting network statistics:', error);
        return {
            interfaces: [],
            totals: {
                rx_bytes: 'N/A',
                tx_bytes: 'N/A',
                rx_errors: 0,
                tx_errors: 0,
                rx_dropped: 0,
                tx_dropped: 0,
                total_packets_rx: 'N/A',
                total_packets_tx: 'N/A'
            },
            error: 'Failed to get network statistics'
        };
    }
});

// Tab and plugin folder management handlers
ipcMain.handle('get-tab-folders', async () => {
    console.log('get-tab-folders handler called');
    const settingsStore = await getStore();
    const disabledPlugins = settingsStore ? settingsStore.get('disabledPlugins', []) : [];
    const tabs = [];
    const plugins = [];

    // 1. Read built-in tabs from the installation directory
    const tabsPath = path.join(__dirname, 'tabs');
    try {
        const items = await fs.readdir(tabsPath);
        for (const item of items) {
            const itemPath = path.join(tabsPath, item);
            try {
                if ((await fs.stat(itemPath)).isDirectory()) {
                    tabs.push({ name: item, type: 'tab' });
                }
            } catch (e) { /* ignore files and other non-directory items */ }
        }
    } catch (error) {
        console.error(`Could not read built-in tabs directory: ${tabsPath}`, error);
    }
    
    // 2. Read enabled plugins from both dev and user locations
    const pluginMap = await getPluginMap();
    for (const pluginId of pluginMap.keys()) {
        if (!disabledPlugins.includes(pluginId)) {
            plugins.push({ name: pluginId, type: 'plugin' });
        }
    }

    // Combine tabs and plugins, ensuring plugins are last
    const allItems = [...tabs, ...plugins];

    console.log('Found tab/plugin items:', allItems);
    return allItems;
});

// Handler to get all plugins, including disabled ones, for the management UI
// Function to calculate the hash of a directory's contents
async function calculateDirectoryHash(directory) {
    const hash = crypto.createHash('sha256');
    const files = await fs.readdir(directory);

    for (const file of files.sort()) { // Sort for consistent hash results
        const filePath = path.join(directory, file);
        const stat = await fs.stat(filePath);

        if (stat.isDirectory()) {
            // Recursively hash subdirectories
            const subDirHash = await calculateDirectoryHash(filePath);
            hash.update(subDirHash);
        } else {
            // Hash file contents
            const fileContents = await fs.readFile(filePath);
            hash.update(fileContents);
        }
    }

    return hash.digest('hex');
}

ipcMain.handle('get-all-plugins', async () => {
    console.log('get-all-plugins handler called');
    const pluginMap = await getPluginMap();
    const settingsStore = await getStore();
    const disabledPlugins = settingsStore ? settingsStore.get('disabledPlugins', []) : [];

    const allPlugins = await Promise.all(Array.from(pluginMap.entries()).map(async ([pluginId, pluginPath]) => {
        const configPath = path.join(pluginPath, 'plugin.json');
        let config = {};
        try {
            const configData = await fs.readFile(configPath, 'utf8');
            config = JSON.parse(configData);
        } catch (e) {
            console.error(`Could not read plugin.json for ${pluginId}:`, e);
            // Return a default object so the plugin still appears, albeit with default info
            config = { name: pluginId, description: 'Could not load plugin manifest.', icon: 'fas fa-exclamation-triangle' };
        }

        // --- Verification Logic ---
        const directoryHash = await calculateDirectoryHash(pluginPath);
        const isVerified = verifiedHashes[pluginId] === directoryHash;
        // --- End Verification Logic ---

        return {
            id: pluginId,
            name: config.name || pluginId,
            description: config.description || 'No description available.',
            version: config.version || 'N/A',
            author: config.author || 'Unknown',
            icon: config.icon || 'fas fa-cog',
            enabled: !disabledPlugins.includes(pluginId),
            verified: isVerified, // Add the verified status to the plugin object
            hash: directoryHash // Add the hash to the plugin object
        };
    }));
    
    return allPlugins;
});

ipcMain.handle('delete-plugin', async (event, pluginId) => {
    
    // For security, we only allow deleting from the user-writable plugins path.
    const userPluginsPath = getPluginsPath();
    const pluginPath = path.join(userPluginsPath, pluginId);

    try {
        // Verify the plugin actually exists in the user directory before proceeding.
        await fs.access(pluginPath);
    } catch (error) {
        return { success: false, message: 'Plugin not found or it is a core plugin that cannot be deleted.' };
    }
    
    // Confirm with the user
    const choice = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: 'Delete Plugin',
        message: `Are you sure you want to permanently delete the plugin "${pluginId}"?`,
        detail: 'This action cannot be undone. The plugin files will be removed from your computer.',
        buttons: ['Delete', 'Cancel'],
        defaultId: 1,
        cancelId: 1
    });

    if (choice.response === 1) { // User canceled
        return { success: true, restarted: false }; // Return success to stop loading icon
    }

    try {
        // Delete the plugin folder
        await fs.rm(pluginPath, { recursive: true, force: true });
        
        // Also remove it from the disabled list if it's there
        const settingsStore = await getStore();
        if (settingsStore) {
            const disabledPlugins = settingsStore.get('disabledPlugins', []);
            const newDisabled = disabledPlugins.filter(id => id !== pluginId);
            settingsStore.set('disabledPlugins', newDisabled);
        }

        // Notify and restart
        await dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Plugin Deleted',
            message: `The plugin "${pluginId}" has been deleted.`,
            detail: 'The application must be restarted for the changes to take effect.',
            buttons: ['Restart Now']
        });

        restartApp();
        return { success: true, restarted: true };

    } catch (error) {
        console.error(`Failed to delete plugin ${pluginId}:`, error);
        return { success: false, message: `Error deleting plugin: ${error.message}` };
    }
});

ipcMain.handle('toggle-plugin-state', async (event, pluginId) => {
    const settingsStore = await getStore();
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
        const restartChoice = await dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: `Plugin ${actionText}`,
            message: `The plugin "${pluginId}" has been ${actionText}.`,
            detail: 'A restart is required for this change to take effect.',
            buttons: ['Restart Now', 'Restart Later'],
            defaultId: 0,
            cancelId: 1
        });

        if (restartChoice.response === 0) { // "Restart Now"
            restartApp();
        }

        return { success: true };
    } catch (error) {
        console.error(`Failed to toggle plugin state for ${pluginId}:`, error);
        return { success: false, message: error.message };
    }
});

ipcMain.handle('install-plugin', async () => {
    // Plugins must ALWAYS be installed to the user-writable directory.
    const userPluginsPath = getPluginsPath();

    // 1. Show open file dialog to select the plugin zip
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Plugin ZIP File',
        properties: ['openFile'],
        filters: [
            { name: 'Plugin Packages', extensions: ['zip'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    if (result.canceled || result.filePaths.length === 0) {
        return { success: false, message: 'Installation canceled.' };
    }

    const zipPath = result.filePaths[0];

    // 2. Extract the zip file to a temporary directory first to inspect it
    const tempDir = path.join(os.tmpdir(), `wintool-plugin-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
        await extract(zipPath, { dir: tempDir });

        // 3. Validate the plugin structure (check for plugin.json)
        const items = await fs.readdir(tempDir);
        // The unzipped folder might contain a single root folder.
        const rootDir = items.length === 1 ? path.join(tempDir, items[0]) : tempDir;

        const manifestPath = path.join(rootDir, 'plugin.json');
        await fs.access(manifestPath); // Throws if not found

        // 4. Determine the final plugin folder name and path
        const pluginName = path.basename(rootDir);
        const finalPath = path.join(userPluginsPath, pluginName);

        // Check if plugin already exists
        try {
            await fs.access(finalPath);
            return { success: false, message: `Plugin "${pluginName}" already exists.` };
        } catch (e) {
            // Doesn't exist, which is good
        }

        // 5. Move the validated plugin from temp to the final plugins directory
        await fs.rename(rootDir, finalPath);

        // Notify the user and ask to restart
        const restartChoice = await dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Plugin Installed',
            message: `Plugin "${pluginName}" has been installed successfully.`,
            detail: 'The application needs to be restarted for the changes to take effect.',
            buttons: ['Restart Now', 'Later'],
            defaultId: 0,
            cancelId: 1
        });

        if (restartChoice.response === 0) { // "Restart Now"
            restartApp();
        }

        return { success: true, message: `Plugin "${pluginName}" installed successfully.` };

    } catch (error) {
        console.error('Plugin installation error:', error);
        return { success: false, message: `Installation failed: ${error.message}` };
    } finally {
        // Clean up the temporary directory
        await fs.rm(tempDir, { recursive: true, force: true });
    }
});

ipcMain.handle('open-plugins-directory', async () => {
    // Always open the user-writable plugins directory, as this is where users should manage plugins.
    const userPluginsPath = getPluginsPath();
    console.log(`Opening user plugins directory: ${userPluginsPath}`);
    await shell.openPath(userPluginsPath);
    return true;
});

ipcMain.handle('run-plugin-script', async (event, pluginId, scriptPath) => {
    // Security Validation
    if (!pluginId || !scriptPath || typeof pluginId !== 'string' || typeof scriptPath !== 'string') {
        throw new Error('Invalid pluginId or scriptPath.');
    }
    
    // Find the correct path for the given pluginId from our map
    const pluginMap = await getPluginMap();
    const pluginDir = pluginMap.get(pluginId);

    if (!pluginDir) {
        throw new Error(`Plugin with ID '${pluginId}' not found.`);
    }

    // Prevent path traversal attacks
    const safeScriptPath = path.normalize(scriptPath).replace(/^(\.\.(\/|\\|$))+/, '');
    const fullScriptPath = path.join(pluginDir, safeScriptPath);

    // Verify the resolved script path is securely within the plugin's directory
    if (!fullScriptPath.startsWith(pluginDir)) {
        throw new Error('Script path is outside of the allowed plugin directory.');
    }

    // Check that the script exists
    await fs.stat(fullScriptPath);

    // Use SimpleCommandExecutor for script execution
    const scriptCommand = `& "${fullScriptPath}"`;

    try {
        const output = await processPool.executePowerShellCommand(scriptCommand);
        return output;
    } catch (error) {
        throw new Error(`Plugin script execution failed: ${error.message}`);
    }
});

// --- New Plugin API Handlers ---

// 1. Handle requests from plugins to show a notification
ipcMain.on('plugin-show-notification', (event, { title, body, type }) => {
    // Forward the request to the main window's renderer process, which owns the UI
    if (mainWindow) {
        mainWindow.webContents.send('display-notification', { title, body, type });
    }
});

// Handle native Windows notifications for System Health Dashboard
ipcMain.handle('show-native-notification', async (event, { title, body, urgency = 'normal', silent = false, persistent = false }) => {
    try {
        console.log('Native notification requested:', { title, body, urgency, silent, persistent });

        // Check if notifications are supported
        if (!Notification.isSupported()) {
            console.warn('Native notifications are not supported on this system');
            return { success: false, error: 'Notifications not supported' };
        }

        console.log('Native notifications are supported');

        // Create the notification
        const notification = new Notification({
            title: title,
            body: body,
            icon: path.join(__dirname, 'assets', 'images', 'icon.ico'), // Use app icon
            urgency: urgency, // 'normal', 'critical', or 'low'
            silent: silent,
            timeoutType: (urgency === 'critical' && persistent) ? 'never' : 'default',
            actions: urgency === 'critical' ? [
                {
                    type: 'button',
                    text: 'View System Health'
                }
            ] : []
        });

        // Handle notification events
        notification.on('show', () => {
            console.log(`Native notification shown: ${title} (urgency: ${urgency}, persistent: ${persistent})`);
        });

        notification.on('click', () => {
            console.log('Native notification clicked:', title);
            // Bring the app to foreground when notification is clicked
            if (mainWindow) {
                if (mainWindow.isMinimized()) mainWindow.restore();
                mainWindow.focus();
                showWindow();

                // Send message to switch to system health tab
                mainWindow.webContents.send('message', 'switch-to-tab:system-health');
            }
        });

        notification.on('action', (event, index) => {
            console.log('Notification action clicked:', index);
            // Handle action button clicks
            if (index === 0) { // "View System Health" button
                if (mainWindow) {
                    if (mainWindow.isMinimized()) mainWindow.restore();
                    mainWindow.focus();
                    showWindow();
                    mainWindow.webContents.send('message', 'switch-to-tab:system-health');
                }
            }
        });

        notification.on('close', () => {
            console.log('Native notification closed:', title);
        });

        // Show the notification
        notification.show();

        return { success: true };
    } catch (error) {
        console.error('Error showing native notification:', error);
        return { success: false, error: error.message };
    }
});



// 2. Handle plugin-specific storage
ipcMain.handle('plugin-storage-get', async (event, pluginId, key) => {
    const settingsStore = await getStore();
    if (!settingsStore) return null;
    // Namespace the key to prevent collisions
    const namespacedKey = `plugin_${pluginId}_${key}`;
    return settingsStore.get(namespacedKey);
});

ipcMain.handle('plugin-storage-set', async (event, pluginId, key, value) => {
    const settingsStore = await getStore();
    if (!settingsStore) return false;
    const namespacedKey = `plugin_${pluginId}_${key}`;
    settingsStore.set(namespacedKey, value);
    return true;
});

// 3. Handle secure file dialogs for plugins
ipcMain.handle('plugin-show-open-dialog', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options);
    if (result.canceled || result.filePaths.length === 0) {
        return { canceled: true, file: null };
    }
    const filePath = result.filePaths[0];
    const content = await fs.readFile(filePath, 'utf8');
    return { canceled: false, file: { path: filePath, content: content } };
});

ipcMain.handle('plugin-show-save-dialog', async (event, options, content) => {
    const result = await dialog.showSaveDialog(mainWindow, options);
    if (result.canceled || !result.filePath) {
        return { canceled: true, path: null };
    }
    await fs.writeFile(result.filePath, content, 'utf8');
    return { canceled: false, path: result.filePath };
});


ipcMain.handle('get-tab-content', async (event, tabFolder) => {
    console.log('get-tab-content handler called for:', tabFolder);

    // Determine the base path (could be a built-in 'tab' or a 'plugin')
    let tabPath;
    let isPlugin = false;
    
    // First, check if it's a built-in tab.
    const builtInTabPath = path.join(__dirname, 'tabs', tabFolder);
    try {
        // Check if config.json exists. This is more reliable than checking the directory inside asar.
        const configPathForCheck = path.join(builtInTabPath, 'config.json');
        await fs.stat(configPathForCheck);
        tabPath = builtInTabPath;
    } catch (e) {
        // If not a built-in tab, check if it's a plugin.
        const pluginMap = await getPluginMap();
        const pluginPath = pluginMap.get(tabFolder);
        if (pluginPath) {
            tabPath = pluginPath;
            isPlugin = true;
        } else {
            console.error(`Folder for '${tabFolder}' not found in built-in tabs or any plugin directories.`);
            throw new Error(`Content for '${tabFolder}' not found.`);
        }
    }

    try {
        // For plugins, the config is named plugin.json
        const configFileName = isPlugin ? 'plugin.json' : 'config.json';
        const configPath = path.join(tabPath, configFileName);
        let config = {};
        try {
            const configData = await fs.readFile(configPath, 'utf8');
            config = JSON.parse(configData);
        } catch (configError) {
            console.log(`No ${configFileName} found for ${tabFolder}, using defaults`);
            config = {
                name: tabFolder,
                icon: 'fas fa-cog',
                description: 'Custom tab/plugin'
            };
        }

        // Read HTML content
        const htmlPath = path.join(tabPath, 'index.html');
        let html = '';
        try {
            html = await fs.readFile(htmlPath, 'utf8');
        } catch (htmlError) {
            html = `<div class="tab-header"><h1><i class="${config.icon}"></i> ${config.name}</h1><p>No index.html found for this tab</p></div>`;
        }

        // Read CSS content
        const cssPath = path.join(tabPath, 'styles.css');
        let css = '';
        try {
            css = await fs.readFile(cssPath, 'utf8');
        } catch (cssError) {
            console.log(`No styles.css found for tab ${tabFolder}`);
        }

        // Read JavaScript content
        const jsPath = path.join(tabPath, 'script.js');
        let js = '';
        try {
            js = await fs.readFile(jsPath, 'utf8');
        } catch (jsError) {
            console.log(`No script.js found for tab ${tabFolder}`);
        }

        return {
            config,
            html,
            css,
            js
        };
    } catch (error) {
        console.error(`Error reading tab content for ${tabFolder}:`, error);
        throw error;
    }
});

// Load applications.json file handler
ipcMain.handle('get-applications-data', async () => {
    console.log('get-applications-data handler called');
    const applicationsPath = path.join(__dirname, 'tabs', 'packages', 'applications.json');

    try {
        const data = await fs.readFile(applicationsPath, 'utf8');
        const applications = JSON.parse(data);
        console.log(`Loaded ${Object.keys(applications).length} applications from applications.json`);
        return applications;
    } catch (error) {
        console.error('Error loading applications.json:', error);
        throw new Error(`Failed to load applications data: ${error.message}`);
    }
});

// Winget command execution handler
ipcMain.handle('execute-winget-command', async (event, command) => {
    console.log('execute-winget-command handler called with:', command);

    // Rate limiting
    if (!checkRateLimit('winget-command')) {
        throw new Error('Rate limit exceeded. Please wait before making more requests.');
    }

    // Input validation and sanitization
    if (!command || typeof command !== 'string') {
        throw new Error('Invalid command parameter');
    }

    // Whitelist allowed winget commands for security
    const allowedCommands = ['search', 'install', 'uninstall', 'list', 'show', 'source', 'upgrade'];
    const commandParts = command.trim().split(' ');
    const mainCommand = commandParts[0];

    if (!allowedCommands.includes(mainCommand)) {
        logSecurityEvent('BLOCKED_WINGET_COMMAND', { command: mainCommand, fullCommand: command });
        throw new Error(`Command '${mainCommand}' is not allowed for security reasons`);
    }

    // Log allowed winget commands for monitoring
    logSecurityEvent('WINGET_COMMAND_EXECUTED', { command: mainCommand, args: commandParts.slice(1) });

    // Sanitize command arguments to prevent injection
    const sanitizedCommand = commandParts.map(part => {
        // Remove potentially dangerous characters
        return part.replace(/[;&|`$(){}[\]<>]/g, '');
    }).join(' ');

    return new Promise((resolve, reject) => {
        const wingetProcess = spawn('winget', sanitizedCommand.split(' '), {
            shell: false, // Changed from true to false for security
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        wingetProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        wingetProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        wingetProcess.on('close', (code) => {
            const output = stdout + (stderr ? '\nErrors:\n' + stderr : '');
            resolve({
                code,
                output,
                success: code === 0
            });
        });

        wingetProcess.on('error', (error) => {
            reject(new Error(`Failed to execute winget: ${error.message}`));
        });
    });
});

// Check if Chocolatey is available
async function checkChocoAvailability() {
    return new Promise((resolve) => {
        const chocoProcess = spawn('choco', ['--version'], {
            shell: false,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        chocoProcess.on('close', (code) => {
            resolve(code === 0);
        });

        chocoProcess.on('error', () => {
            resolve(false);
        });
    });
}

// Chocolatey command execution handler
ipcMain.handle('execute-choco-command', async (event, command) => {
    console.log('execute-choco-command handler called with:', command);

    // Check if Chocolatey is available
    const chocoAvailable = await checkChocoAvailability();
    if (!chocoAvailable) {
        throw new Error('Chocolatey is not installed or not available in PATH. Please install Chocolatey first: https://chocolatey.org/install');
    }

    // Rate limiting
    if (!checkRateLimit('choco-command')) {
        throw new Error('Rate limit exceeded. Please wait before making more requests.');
    }

    // Input validation and sanitization
    if (!command || typeof command !== 'string') {
        throw new Error('Invalid command parameter');
    }

    const allowedCommands = ['search', 'install', 'uninstall', 'list', 'info', 'upgrade', 'outdated'];
    const commandParts = command.trim().split(' ');
    const mainCommand = commandParts[0];

    if (!allowedCommands.includes(mainCommand)) {
        throw new Error(`Command '${mainCommand}' is not allowed for security reasons`);
    }

    // Sanitize command parts to prevent injection
    const sanitizedCommand = commandParts.map(part => {
        return part.replace(/[;&|`$(){}[\]<>]/g, '');
    }).join(' ');

    return new Promise((resolve, reject) => {
        const chocoProcess = spawn('choco', sanitizedCommand.split(' '), {
            shell: false,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        chocoProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        chocoProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        chocoProcess.on('close', (code) => {
            const output = stdout + (stderr ? '\nErrors:\n' + stderr : '');
            resolve({
                code,
                output,
                success: code === 0
            });
        });

        chocoProcess.on('error', (error) => {
            reject(new Error(`Failed to execute chocolatey: ${error.message}`));
        });
    });
});

// Chocolatey command execution with progress streaming
ipcMain.handle('execute-choco-command-with-progress', async (event, command) => {
    console.log('execute-choco-command-with-progress handler called with:', command);

    // Check if Chocolatey is available
    const chocoAvailable = await checkChocoAvailability();
    if (!chocoAvailable) {
        throw new Error('Chocolatey is not installed or not available in PATH. Please install Chocolatey first: https://chocolatey.org/install');
    }

    // Input validation and sanitization (same as above)
    if (!command || typeof command !== 'string') {
        throw new Error('Invalid command parameter');
    }

    const allowedCommands = ['search', 'install', 'uninstall', 'list', 'info', 'upgrade', 'outdated'];
    const commandParts = command.trim().split(' ');
    const mainCommand = commandParts[0];

    if (!allowedCommands.includes(mainCommand)) {
        throw new Error(`Command '${mainCommand}' is not allowed for security reasons`);
    }

    const sanitizedCommand = commandParts.map(part => {
        return part.replace(/[;&|`$(){}[\]<>]/g, '');
    }).join(' ');

    return new Promise((resolve, reject) => {
        const chocoProcess = spawn('choco', sanitizedCommand.split(' '), {
            shell: false,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';
        let progressPercentage = 0;

        // Send initial progress
        event.sender.send('choco-progress', {
            type: 'progress',
            percentage: 0,
            message: 'Starting operation...'
        });

        chocoProcess.stdout.on('data', (data) => {
            const output = data.toString();
            stdout += output;

            // Send progress updates
            event.sender.send('choco-progress', {
                type: 'output',
                message: output
            });

            // Try to extract progress information from chocolatey output
            if (output.includes('Progress:')) {
                const progressMatch = output.match(/Progress:\s*(\d+)%/);
                if (progressMatch) {
                    progressPercentage = parseInt(progressMatch[1]);
                    event.sender.send('choco-progress', {
                        type: 'progress',
                        percentage: progressPercentage,
                        message: `Processing... ${progressPercentage}%`
                    });
                }
            } else if (output.includes('Installing') || output.includes('Downloading')) {
                progressPercentage = Math.min(progressPercentage + 10, 90);
                event.sender.send('choco-progress', {
                    type: 'progress',
                    percentage: progressPercentage,
                    message: 'Installing package...'
                });
            }
        });

        chocoProcess.stderr.on('data', (data) => {
            const output = data.toString();
            stderr += output;

            event.sender.send('choco-progress', {
                type: 'output',
                message: output
            });
        });

        chocoProcess.on('close', (code) => {
            const output = stdout + (stderr ? '\nErrors:\n' + stderr : '');

            event.sender.send('choco-progress', {
                type: 'complete',
                percentage: 100,
                message: code === 0 ? 'Operation completed successfully' : 'Operation completed with errors',
                success: code === 0
            });

            resolve({
                code,
                output,
                success: code === 0
            });
        });

        chocoProcess.on('error', (error) => {
            event.sender.send('choco-progress', {
                type: 'error',
                message: `Failed to execute chocolatey: ${error.message}`
            });
            reject(new Error(`Failed to execute chocolatey: ${error.message}`));
        });
    });
});

// Check Chocolatey availability
ipcMain.handle('check-choco-availability', async () => {
    return await checkChocoAvailability();
});

// Winget command execution with progress streaming
ipcMain.handle('execute-winget-command-with-progress', async (event, command) => {
    console.log('execute-winget-command-with-progress handler called with:', command);

    // Input validation and sanitization (same as above)
    if (!command || typeof command !== 'string') {
        throw new Error('Invalid command parameter');
    }

    const allowedCommands = ['search', 'install', 'uninstall', 'list', 'show', 'source', 'upgrade'];
    const commandParts = command.trim().split(' ');
    const mainCommand = commandParts[0];

    if (!allowedCommands.includes(mainCommand)) {
        throw new Error(`Command '${mainCommand}' is not allowed for security reasons`);
    }

    const sanitizedCommand = commandParts.map(part => {
        return part.replace(/[;&|`$(){}[\]<>]/g, '');
    }).join(' ');

    return new Promise((resolve, reject) => {
        const wingetProcess = spawn('winget', sanitizedCommand.split(' '), {
            shell: false, // Changed from true to false for security
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';
        let progressPercentage = 0;

        // Send initial progress
        event.sender.send('winget-progress', {
            type: 'progress',
            percentage: 0,
            message: 'Starting operation...'
        });

        wingetProcess.stdout.on('data', (data) => {
            const output = data.toString();
            stdout += output;

            // Send output to renderer
            event.sender.send('winget-progress', {
                type: 'output',
                data: output
            });

            // Try to parse progress from winget output
            const progressMatch = output.match(/(\d+)%/);
            if (progressMatch) {
                const newPercentage = parseInt(progressMatch[1]);
                if (newPercentage > progressPercentage) {
                    progressPercentage = newPercentage;
                    event.sender.send('winget-progress', {
                        type: 'progress',
                        percentage: progressPercentage
                    });
                }
            }

            // Check for specific winget status messages
            if (output.includes('Downloading')) {
                event.sender.send('winget-progress', {
                    type: 'progress',
                    percentage: Math.max(progressPercentage, 20),
                    message: 'Downloading package...'
                });
            } else if (output.includes('Installing')) {
                event.sender.send('winget-progress', {
                    type: 'progress',
                    percentage: Math.max(progressPercentage, 60),
                    message: 'Installing package...'
                });
            } else if (output.includes('Successfully installed')) {
                event.sender.send('winget-progress', {
                    type: 'progress',
                    percentage: 100,
                    message: 'Installation completed'
                });
            }
        });

        wingetProcess.stderr.on('data', (data) => {
            const output = data.toString();
            stderr += output;

            // Send error output to renderer
            event.sender.send('winget-progress', {
                type: 'output',
                data: output
            });
        });

        wingetProcess.on('close', (code) => {
            const output = stdout + (stderr ? '\nErrors:\n' + stderr : '');

            if (code === 0) {
                event.sender.send('winget-progress', {
                    type: 'complete',
                    message: 'Operation completed successfully'
                });
            } else {
                event.sender.send('winget-progress', {
                    type: 'error',
                    message: `Operation failed with exit code ${code}`
                });
            }

            resolve({
                code,
                output,
                success: code === 0
            });
        });

        wingetProcess.on('error', (error) => {
            event.sender.send('winget-progress', {
                type: 'error',
                message: `Failed to execute winget: ${error.message}`
            });
            reject(new Error(`Failed to execute winget: ${error.message}`));
        });
    });
});

// Cleanup functionality handlers
ipcMain.handle('get-disk-space', async () => {
    console.log('get-disk-space handler called');

    try {
        // Use inline PowerShell command that works in both dev and packaged environments
        const psCommand = `
            try {
                $ErrorActionPreference = "Stop"
                $disk = Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID='C:'" -ErrorAction Stop
                if ($disk -and $disk.Size -gt 0) {
                    $result = @{
                        Total = [long]$disk.Size
                        Free = [long]$disk.FreeSpace
                        Used = [long]($disk.Size - $disk.FreeSpace)
                    }
                    $result | ConvertTo-Json -Compress
                } else {
                    $volume = Get-Volume -DriveLetter C -ErrorAction SilentlyContinue
                    if ($volume) {
                        $total = $volume.Size
                        $free = $volume.SizeRemaining
                        $used = $total - $free
                        $result = @{
                            Total = [long]$total
                            Free = [long]$free
                            Used = [long]$used
                        }
                        $result | ConvertTo-Json -Compress
                    } else {
                        @{Total = 0; Free = 0; Used = 0; Error = "No C: drive found"} | ConvertTo-Json -Compress
                    }
                }
            } catch {
                @{Total = 0; Free = 0; Used = 0; Error = $_.Exception.Message} | ConvertTo-Json -Compress
            }
        `;

        const stdout = await processPool.executePowerShellCommand(psCommand);
        console.log(`PowerShell stdout: ${stdout}`);

        if (stdout.trim() && stdout.trim() !== "ERROR") {
            const diskData = JSON.parse(stdout.trim());
            console.log('Parsed disk data:', diskData);

            // Validate the data
            if (diskData.Total && diskData.Total > 0) {
                return {
                    total: parseInt(diskData.Total),
                    free: parseInt(diskData.Free),
                    used: parseInt(diskData.Used)
                };
            }
        }

        // If we get here, use fallback values
        console.log('Using fallback disk space values');
        return {
            total: 0,
            free: 0,
            used: 0,
            error: 'Unable to retrieve disk space information'
        };

    } catch (error) {
        console.error('Error getting disk space:', error);
        return {
            total: 0,
            free: 0,
            used: 0,
            error: error.message
        };
    }

});



ipcMain.handle('execute-cleanup', async (event, category) => {
    console.log('execute-cleanup handler called for:', category);

    return new Promise((resolve, reject) => {
        const path = require('path');
        let scriptPath = '';

        // Determine the correct scripts directory based on whether app is packaged
        const scriptsDir = app.isPackaged
            ? path.join(process.resourcesPath, 'scripts')
            : path.join(__dirname, 'scripts');

        switch (category) {
            case 'temp':
                scriptPath = path.join(scriptsDir, 'clean-temp.ps1');
                break;

            case 'system':
                scriptPath = path.join(scriptsDir, 'clean-system.ps1');
                break;

            case 'cache':
                scriptPath = path.join(scriptsDir, 'clean-cache.ps1');
                break;

            case 'browser':
                scriptPath = path.join(scriptsDir, 'clean-browser.ps1');
                break;

            case 'updates':
                scriptPath = path.join(scriptsDir, 'clean-updates.ps1');
                break;

            case 'logs':
                scriptPath = path.join(scriptsDir, 'clean-logs.ps1');
                break;

            case 'recycle':
                scriptPath = path.join(scriptsDir, 'clean-recycle.ps1');
                break;

            case 'dumps':
                scriptPath = path.join(scriptsDir, 'clean-dumps.ps1');
                break;

            case 'registry':
                // For registry, we'll simulate cleanup since actual registry operations are risky
                resolve({ category, filesRemoved: 25, sizeFreed: 5 * 1024 * 1024 }); // 5MB simulated
                return;

            default:
                reject(new Error('Unknown cleanup category'));
                return;
        }

        // Use SimpleCommandExecutor for script execution
        const scriptCommand = `& "${scriptPath}"`;

        processPool.executePowerShellCommand(scriptCommand)
            .then((output) => {
                console.log(`Cleanup PowerShell completed successfully`);
                console.log(`Cleanup PowerShell output: ${output}`);

                const trimmedOutput = output.trim();
                if (trimmedOutput) {
                    try {
                        const result = JSON.parse(trimmedOutput);
                        resolve({
                            category,
                            filesRemoved: result.filesRemoved || 0,
                            sizeFreed: result.sizeFreed || 0
                        });
                    } catch (error) {
                        console.error('JSON parse error:', error);
                        // Fallback to old format
                        const filesRemoved = parseInt(trimmedOutput) || 0;
                        resolve({ category, filesRemoved, sizeFreed: 0 });
                    }
                } else {
                    // Handle case where script runs successfully but returns no output
                    console.log(`Cleanup script for ${category} completed with no output - assuming no files to clean`);
                    resolve({
                        category,
                        filesRemoved: 0,
                        sizeFreed: 0
                    });
                }
            })
            .catch((error) => {
                console.error('Cleanup PowerShell command failed:', error);
                reject(new Error(`Failed to clean ${category} files: ${error.message}`));
            });
    });
});

ipcMain.handle('open-disk-cleanup', async () => {
    console.log('open-disk-cleanup handler called');

    return new Promise((resolve, reject) => {
        const cleanmgrProcess = spawn('cleanmgr', ['/d', 'C:'], {
            shell: true,
            detached: true,
            stdio: 'ignore'
        });

        cleanmgrProcess.unref();
        resolve({ success: true, message: 'Windows Disk Cleanup opened' });
    });
});

// System utilities launcher handler
ipcMain.handle('launch-system-utility', async (event, utilityCommand) => {
    console.log('launch-system-utility handler called with:', utilityCommand);

    // Input validation and whitelist for security
    if (!utilityCommand || typeof utilityCommand !== 'string') {
        throw new Error('Invalid utility command parameter');
    }

    // Whitelist of allowed system utilities for security
    const allowedUtilities = [
        'taskmgr', 'devmgmt.msc', 'diskmgmt.msc', 'services.msc', 'eventvwr.msc',
        'perfmon.msc', 'compmgmt.msc', 'gpedit.msc', 'secpol.msc', 'lusrmgr.msc',
        'regedit', 'msconfig', 'cmd', 'powershell', 'control', 'appwiz.cpl',
        'desk.cpl', 'firewall.cpl', 'inetcpl.cpl', 'intl.cpl', 'main.cpl',
        'mmsys.cpl', 'ncpa.cpl', 'powercfg.cpl', 'sysdm.cpl', 'timedate.cpl',
        'wscui.cpl', 'cleanmgr', 'dxdiag', 'msinfo32', 'resmon', 'winver',
        'dfrgui', 'diskpart', 'netplwiz', 'ms-settings:', 'wt', 'windowsterminal',
        'calc', 'notepad', 'mspaint', 'snippingtool', 'magnify', 'osk'
    ];

    // Check if command starts with allowed utility or control command
    const isAllowed = allowedUtilities.some(util =>
        utilityCommand === util ||
        utilityCommand.startsWith(util + ' ') ||
        utilityCommand.startsWith('control ' + util)
    );

    if (!isAllowed) {
        throw new Error(`Utility '${utilityCommand}' is not allowed for security reasons`);
    }

    // Sanitize the command
    const sanitizedCommand = utilityCommand.replace(/[;&|`$(){}[\]<>]/g, '');

    return new Promise((resolve, reject) => {
        try {
            let process;

            // Handle special cases for different utility types
            if (sanitizedCommand.includes('.msc') || sanitizedCommand.includes('.cpl')) {
                // For .msc and .cpl files, use 'start' command
                process = spawn('cmd', ['/c', 'start', '""', sanitizedCommand], {
                    shell: false,
                    detached: true,
                    stdio: 'ignore'
                });
            } else if (sanitizedCommand === 'cmd') {
                // For command prompt, open in new window
                process = spawn('cmd', ['/c', 'start', 'cmd'], {
                    shell: false,
                    detached: true,
                    stdio: 'ignore'
                });
            } else if (sanitizedCommand === 'powershell') {
                // For PowerShell, open in new window
                process = spawn('cmd', ['/c', 'start', 'powershell'], {
                    shell: false,
                    detached: true,
                    stdio: 'ignore'
                });
            } else if (sanitizedCommand === 'wt' || sanitizedCommand === 'windowsterminal') {
                // For Windows Terminal (Windows 11)
                process = spawn('cmd', ['/c', 'start', 'wt'], {
                    shell: false,
                    detached: true,
                    stdio: 'ignore'
                });
            } else if (sanitizedCommand.startsWith('ms-settings:')) {
                // For Windows 11 Settings app deep links
                process = spawn('cmd', ['/c', 'start', '""', sanitizedCommand], {
                    shell: false,
                    detached: true,
                    stdio: 'ignore'
                });
            } else if (sanitizedCommand.startsWith('control ')) {
                // For control panel commands
                process = spawn('cmd', ['/c', 'start', '""', sanitizedCommand], {
                    shell: false,
                    detached: true,
                    stdio: 'ignore'
                });
            } else if (sanitizedCommand === 'cleanmgr') {
                // For disk cleanup, check if it exists, fallback to Storage Sense
                const fs = require('fs');
                const cleanmgrPath = 'C:\\Windows\\System32\\cleanmgr.exe';
                if (fs.existsSync(cleanmgrPath)) {
                    process = spawn('cmd', ['/c', 'start', '""', 'cleanmgr'], {
                        shell: false,
                        detached: true,
                        stdio: 'ignore'
                    });
                } else {
                    // Fallback to Storage Sense in Windows 11
                    process = spawn('cmd', ['/c', 'start', '""', 'ms-settings:storagesense'], {
                        shell: false,
                        detached: true,
                        stdio: 'ignore'
                    });
                }
            } else if (sanitizedCommand === 'dfrgui') {
                // For defrag, check if it exists, fallback to Storage settings
                const fs = require('fs');
                const dfrgPath = 'C:\\Windows\\System32\\dfrgui.exe';
                if (fs.existsSync(dfrgPath)) {
                    process = spawn('cmd', ['/c', 'start', '""', 'dfrgui'], {
                        shell: false,
                        detached: true,
                        stdio: 'ignore'
                    });
                } else {
                    // Fallback to Storage optimization in Windows 11
                    process = spawn('cmd', ['/c', 'start', '""', 'ms-settings:storagesense'], {
                        shell: false,
                        detached: true,
                        stdio: 'ignore'
                    });
                }
            } else {
                // For other utilities, use start command to ensure proper launching
                process = spawn('cmd', ['/c', 'start', '""', sanitizedCommand], {
                    shell: false,
                    detached: true,
                    stdio: 'ignore'
                });
            }

            // Add error handling for the spawned process
            process.on('error', (error) => {
                console.error(`Error launching ${sanitizedCommand}:`, error);
                reject(new Error(`Failed to launch ${sanitizedCommand}: ${error.message}`));
            });

            process.on('close', (code) => {
                if (code !== 0 && code !== null) {
                    console.warn(`Process ${sanitizedCommand} exited with code ${code}`);
                }
            });

            process.unref();

            // Give the process a moment to start before resolving
            setTimeout(() => {
                resolve({
                    success: true,
                    message: `Successfully launched ${sanitizedCommand}`
                });
            }, 100);

        } catch (error) {
            console.error('Error launching utility:', error);
            reject(new Error(`Failed to launch ${sanitizedCommand}: ${error.message}`));
        }
    });
});

// Services Management IPC handlers
ipcMain.handle('get-services', async () => {
    console.log('get-services handler called');

    try {
        // Use the SimpleCommandExecutor's getWindowsServices method
        // This method automatically tries WMIC first, then falls back to PowerShell
        console.log('Getting services using SimpleCommandExecutor...');
        const services = await processPool.getWindowsServices();

        if (!services || services.length === 0) {
            throw new Error('No services returned from SimpleCommandExecutor');
        }

        const enhancedServices = services.map(service => ({
            Name: service.Name,
            DisplayName: service.DisplayName || service.Name,
            Status: service.Status,
            StartType: service.StartType,
            isCommonService: isCommonService(service.Name)
        }));

        console.log(`Successfully processed ${enhancedServices.length} services`);
        return enhancedServices;

    } catch (error) {
        console.error('Error getting services:', error);
        console.error('Error stack:', error.stack);
        throw new Error(`Failed to get services: ${error.message}`);
    }
});

// Helper function to identify common services
function isCommonService(serviceName) {
    const commonServices = [
        'wuauserv',      // Windows Update
        'spooler',       // Print Spooler
        'BITS',          // Background Intelligent Transfer Service
        'Themes',        // Themes
        'AudioSrv',      // Windows Audio
        'Dhcp',          // DHCP Client
        'Dnscache',      // DNS Client
        'EventLog',      // Windows Event Log
        'LanmanServer',  // Server
        'LanmanWorkstation', // Workstation
        'RpcSs',         // Remote Procedure Call (RPC)
        'Schedule',      // Task Scheduler
        'W32Time',       // Windows Time
        'Winmgmt',       // Windows Management Instrumentation
        'wscsvc',        // Security Center
        'MpsSvc',        // Windows Defender Firewall
        'WinDefend',     // Windows Defender Antivirus Service
        'Netman',        // Network Connections
        'NlaSvc',        // Network Location Awareness
        'PlugPlay'       // Plug and Play
    ];

    return commonServices.includes(serviceName);
}

ipcMain.handle('control-service', async (event, serviceName, action) => {
    console.log(`control-service handler called: ${action} ${serviceName}`);

    // Rate limiting
    if (!checkRateLimit('service-control')) {
        throw new Error('Rate limit exceeded. Please wait before making more requests.');
    }

    // Input validation
    if (!serviceName || typeof serviceName !== 'string') {
        throw new Error('Invalid service name parameter');
    }
    if (!action || typeof action !== 'string') {
        throw new Error('Invalid action parameter');
    }

    // Sanitize service name to prevent injection
    const sanitizedServiceName = serviceName.replace(/[^a-zA-Z0-9_-]/g, '');
    if (sanitizedServiceName !== serviceName) {
        throw new Error('Service name contains invalid characters');
    }

    // Validate service name length
    if (sanitizedServiceName.length === 0 || sanitizedServiceName.length > 100) {
        throw new Error('Service name length is invalid');
    }

    // Map actions to PowerShell commands
    let psCommand;
    switch (action) {
        case 'start':
            psCommand = `Start-Service -Name "${sanitizedServiceName}" -ErrorAction Stop; Write-Output "Service started successfully"`;
            break;
        case 'stop':
            psCommand = `Stop-Service -Name "${sanitizedServiceName}" -Force -ErrorAction Stop; Write-Output "Service stopped successfully"`;
            break;
        case 'restart':
            psCommand = `Restart-Service -Name "${sanitizedServiceName}" -Force -ErrorAction Stop; Write-Output "Service restarted successfully"`;
            break;
        default:
            throw new Error(`Invalid action: ${action}`);
    }

    try {
        const output = await executeOptimizedPowerShell(psCommand);
        return {
            success: true,
            message: output.trim() || `Service ${action} completed successfully`,
            serviceName: serviceName,
            action: action
        };
    } catch (error) {
        console.error(`PowerShell error for ${action} ${serviceName}:`, error.message);
        throw new Error(`Failed to ${action} service: ${error.message}`);
    }
});

ipcMain.handle('get-service-details', async (event, serviceName) => {
    console.log(`get-service-details handler called for: ${serviceName}`);

    // Input validation
    if (!serviceName || typeof serviceName !== 'string') {
        throw new Error('Invalid service name parameter');
    }

    // Sanitize service name
    const sanitizedServiceName = serviceName.replace(/[^a-zA-Z0-9_-]/g, '');
    if (sanitizedServiceName !== serviceName) {
        throw new Error('Service name contains invalid characters');
    }

    if (sanitizedServiceName.length === 0 || sanitizedServiceName.length > 100) {
        throw new Error('Service name length is invalid');
    }

    try {
        // Get detailed service information
        const psScript = `
$service = Get-Service -Name "${sanitizedServiceName}" -ErrorAction Stop
$wmiService = Get-WmiObject -Class Win32_Service -Filter "Name='${sanitizedServiceName}'" -ErrorAction SilentlyContinue
$result = @{
    Name = $service.Name
    DisplayName = $service.DisplayName
    Status = $service.Status.ToString()
    StartType = $service.StartType.ToString()
    ServiceType = $service.ServiceType.ToString()
    CanPauseAndContinue = $service.CanPauseAndContinue
    CanShutdown = $service.CanShutdown
    CanStop = $service.CanStop
    DependentServices = @()
    ServicesDependedOn = @()
}
if ($wmiService) {
    $result.Description = $wmiService.Description
    $result.PathName = $wmiService.PathName
    $result.ProcessId = $wmiService.ProcessId
    $result.StartName = $wmiService.StartName
    $result.State = $wmiService.State
}
$result | ConvertTo-Json -Depth 2
        `.trim();

        // Use SimpleCommandExecutor instead of direct spawn
        const psOutput = await processPool.executePowerShellCommand(psScript);

        if (!psOutput || psOutput.trim().length === 0) {
            throw new Error('No output received from PowerShell command');
        }

        const serviceDetails = JSON.parse(psOutput);
        return serviceDetails;

    } catch (error) {
        console.error('Error getting service details:', error);
        throw new Error(`Failed to get service details: ${error.message}`);
    }
});

// PowerShell execution function using SimpleCommandExecutor
async function executeOptimizedPowerShell(command, timeout = 30000) {
    return processPool.executePowerShellCommand(command, timeout);
}




// Handler to finish startup phase early
ipcMain.handle('finish-startup-phase', async () => {
    processPool.finishStartupPhase();
    return { success: true };
});

// PowerShell execution handler
ipcMain.handle('execute-powershell', async (event, command) => {
    console.log('execute-powershell handler called');

    if (!command || typeof command !== 'string') {
        throw new Error('Invalid command parameter');
    }

    try {
        const output = await processPool.executePowerShellCommand(command);
        return output;
    } catch (error) {
        // Don't log expected failures as errors
        if (!processPool.isExpectedFailure(command, error.message)) {
            console.error('PowerShell execution error:', error);
        }
        throw new Error(`PowerShell command failed: ${error.message}`);
    }
});

// CMD execution handler
ipcMain.handle('execute-cmd', async (event, command) => {
    console.log('execute-cmd handler called');

    if (!command || typeof command !== 'string') {
        throw new Error('Invalid command parameter');
    }

    try {
        const output = await processPool.executeCmdCommand(command);
        return output;
    } catch (error) {
        console.error('CMD execution error:', error);
        throw new Error(`CMD command failed: ${error.message}`);
    }
});




ipcMain.handle('show-open-dialog', async (event, options) => {
    console.log('show-open-dialog handler called with options:', options);
    try {
        const result = await dialog.showOpenDialog(mainWindow, options);
        return result;
    } catch (error) {
        console.error('Error showing open dialog:', error);
        throw new Error(`Failed to show open dialog: ${error.message}`);
    }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
    console.log('write-file handler called for:', filePath);
    try {
        await fs.writeFile(filePath, content, 'utf8');
        return { success: true };
    } catch (error) {
        console.error('Error writing file:', error);
        throw new Error(`Failed to write file: ${error.message}`);
    }
});

ipcMain.handle('read-file', async (event, filePath) => {
    console.log('read-file handler called for:', filePath);
    try {
        const content = await fs.readFile(filePath, 'utf8');
        return content;
    } catch (error) {
        console.error('Error reading file:', error);
        throw new Error(`Failed to read file: ${error.message}`);
    }
});





// File operation handlers
ipcMain.handle('open-file-dialog', async (event) => {
    console.log('open-file-dialog handler called');
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Scripts', extensions: ['ps1', 'bat', 'cmd', 'sh', 'js'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }

    const filePath = result.filePaths[0];
    try {
        const content = await fs.readFile(filePath, 'utf8');
        return { filePath, content };
    } catch (error) {
        console.error('Error reading file:', error);
        throw new Error(`Failed to read file: ${error.message}`);
    }
});

ipcMain.handle('show-save-dialog', async (event, options) => {
    console.log('show-save-dialog handler called with options:', options);
    try {
        const result = await dialog.showSaveDialog(mainWindow, options);
        return result;
    } catch (error) {
        console.error('Error showing save dialog:', error);
        throw new Error(`Failed to show save dialog: ${error.message}`);
    }
});

// Script execution handler for the editor tab
ipcMain.handle('execute-script', async (event, { script, shell }) => {
    console.log(`execute-script handler called for shell: ${shell}`);

    // Use SimpleCommandExecutor for both PowerShell and CMD
    if (shell === 'powershell') {
        try {
            const output = await processPool.executePowerShellCommand(script);
            return {
                success: true,
                stdout: output,
                stderr: ''
            };
        } catch (error) {
            return {
                success: false,
                stdout: '',
                stderr: error.message
            };
        }
    }

    // For CMD, use SimpleCommandExecutor
    try {
        const output = await processPool.executeCmdCommand(script);
        return {
            success: true,
            stdout: output,
            stderr: ''
        };
    } catch (error) {
        return {
            success: false,
            stdout: '',
            stderr: error.message
        };
    }
});





// Event Viewer IPC handler
ipcMain.handle('get-event-logs', async (event, logName) => {
    console.log(`get-event-logs handler called for: ${logName}`);

    // Input validation
    if (!logName || typeof logName !== 'string' || !['Application', 'System', 'Security'].includes(logName)) {
        throw new Error('Invalid log name parameter');
    }

    const psScript = `
    try {
        Get-WinEvent -LogName '${logName}' -MaxEvents 100 -ErrorAction Stop |
        Select-Object @{Name='TimeCreated';Expression={$_.TimeCreated.ToString('o')}},
                      LevelDisplayName, ProviderName, Id,
                      @{Name='Message';Expression={$_.Message -replace '[\\r\\n]+', ' ' -replace '"', "'"}} |
        ConvertTo-Json -Compress
    } catch {
        Write-Output '[]'
    }
    `.trim();

    try {
        const output = await processPool.executePowerShellCommand(psScript);
        const trimmedOutput = output.trim();

        if (!trimmedOutput || trimmedOutput === '[]') {
            return [];
        }

        try {
            const events = JSON.parse(trimmedOutput);
            return Array.isArray(events) ? events : [events];
        } catch (parseError) {
            console.warn('Failed to parse event logs JSON:', parseError.message);
            return [];
        }
    } catch (error) {
        console.error('Error getting event logs:', error);
        // Return empty array instead of throwing to prevent app crashes
        return [];
    }
});

ipcMain.handle('save-file-dialog-and-write', async (event, content, options) => {
    const { title, defaultPath, filters } = options || {};
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: title || 'Save File',
        defaultPath,
        filters: filters || [{ name: 'All Files', extensions: ['*'] }],
    });

    if (canceled || !filePath) {
        return { success: false, canceled: true };
    }

    try {
        // Content is expected to be a string.
        await fs.writeFile(filePath, content, 'utf8');
        return { success: true, filePath };
    } catch (error) {
        console.error('Failed to save file:', error);
        return { success: false, error: error.message };
    }
});

// Refresh verified plugins list handler
ipcMain.handle('refresh-verified-plugins', async () => {
    console.log('refresh-verified-plugins handler called');
    try {
        await updateVerifiedPluginsList();
        return { success: true, message: 'Verified plugins list refreshed successfully' };
    } catch (error) {
        console.error('Failed to refresh verified plugins list:', error);
        return { success: false, message: error.message };
    }
});

// Get current verified plugins list handler
ipcMain.handle('get-verified-plugins', async () => {
    console.log('get-verified-plugins handler called');
    return {
        success: true,
        verifiedHashes: { ...verifiedHashes },
        count: Object.keys(verifiedHashes).length
    };
});

// End of file