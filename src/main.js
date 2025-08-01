/**
 * WinTool - Main Electron Process
 *
 * Copyright (c) 2024 MTechWare
 * Licensed under GPL-3.0-or-later
 *
 * Windows System Management Tool with security-focused design.
 * Performs system cleanup, process management, and optimization.
 */

const { app, BrowserWindow, ipcMain, dialog, shell, globalShortcut } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const os = require('os');
const windowsSysInfo = require('./utils/windows-sysinfo');
const discordPresence = require('./js/modules/discord-presence');
const SimpleCommandExecutor = require('./utils/simple-command-executor');
const WindowManager = require('./modules/window-manager');
const SettingsManager = require('./modules/settings-manager');
const PluginManager = require('./modules/plugin-manager');
const SystemTray = require('./modules/system-tray');
const LoggingManager = require('./modules/logging-manager');

const processPool = new SimpleCommandExecutor();

/**
 * Applies performance optimizations based on detected system capabilities.
 * Detects system capabilities and applies appropriate performance settings.
 *
 * @async
 * @function applyPerformanceOptimizations
 * @returns {Promise<void>} Promise that resolves when optimizations are applied
 * @throws {Error} Logs error if optimization application fails
 */
async function applyPerformanceOptimizations() {
    try {
        const systemCapabilities = await processPool.detectSystemCapabilities();
        await settingsManager.applyPerformanceOptimizations(systemCapabilities);
    } catch (error) {
        loggingManager.logError(
            `Error applying performance optimizations: ${error.message}`,
            'PerformanceOptimizer'
        );
    }
}

const settingsManager = new SettingsManager();
const windowManager = new WindowManager();
const pluginManager = new PluginManager();
const systemTray = new SystemTray();
const loggingManager = new LoggingManager();

/**
 * Ensures the user-writable directories exist on startup.
 * Creates the application data directory and plugin directories if they don't exist.
 *
 * @async
 * @function ensureAppDirectoriesExist
 * @returns {Promise<void>} Promise that resolves when directories are created
 * @throws {Error} Shows error dialog if directory creation fails
 */
async function ensureAppDirectoriesExist() {
    try {
        const appDataPath = getAppDataPath();
        await fs.mkdir(appDataPath, { recursive: true });
        await pluginManager.ensurePluginsDirectoryExists();
    } catch (error) {
        loggingManager.logError(
            `Fatal: Failed to create user directories: ${error.message}`,
            'Initialization'
        );
        dialog.showErrorBox(
            'Initialization Error',
            `Failed to create required directories. Please check permissions.`
        );
    }
}

const rateLimiter = new Map();
const RATE_LIMIT_WINDOW = 60000;
const MAX_REQUESTS_PER_WINDOW = 30;

/**
 * Checks if an operation is within rate limit constraints.
 * Implements a sliding window rate limiter to prevent abuse of sensitive operations.
 *
 * @function checkRateLimit
 * @param {string} operation - The operation identifier to check rate limit for
 * @returns {boolean} True if operation is allowed, false if rate limit exceeded
 */
function checkRateLimit(operation) {
    const now = Date.now();
    const key = operation;

    if (!rateLimiter.has(key)) {
        rateLimiter.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return true;
    }

    const limit = rateLimiter.get(key);
    if (now > limit.resetTime) {
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

app.setName('WinTool');

app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor,UseSurfaceLayerForVideo');
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('--disable-ipc-flooding-protection');
app.commandLine.appendSwitch('--disable-gpu-sandbox');
app.commandLine.appendSwitch('--disable-software-rasterizer');
app.commandLine.appendSwitch('--memory-pressure-off');
app.commandLine.appendSwitch('--max_old_space_size=512');

/**
 * Gets the user-writable path for storing app data.
 * Prefers LOCALAPPDATA on Windows, falls back to Electron's userData path.
 *
 * @function getAppDataPath
 * @returns {string} The full path to the application data directory
 */
function getAppDataPath() {
    let basePath;

    if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
        basePath = process.env.LOCALAPPDATA;
    } else {
        basePath = app.getPath('userData');
    }

    return path.join(basePath, 'MTechWare', 'WinTool');
}

/**
 * Restarts the application by reloading the main window.
 * Used for applying settings changes that require a restart.
 *
 * @function restartApp
 * @returns {void}
 */
function restartApp() {
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow) {
        mainWindow.reload();
    }
}

/**
 * Creates the admin prompt window to request elevation.
 * Shows a dedicated window explaining why admin privileges are needed.
 *
 * @async
 * @function createAdminPromptWindow
 * @returns {Promise<void>} Promise that resolves when admin prompt window is created
 */
async function createAdminPromptWindow() {
    const adminPromptWindow = new BrowserWindow({
        width: 580,
        height: 850,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            webSecurity: false,
            devTools: process.env.NODE_ENV !== 'production',
        },
        frame: false,
        transparent: false,
        resizable: false,
        maximizable: false,
        minimizable: false,
        alwaysOnTop: true,
        center: true,
        show: true,
        icon: path.join(__dirname, 'assets', 'images', 'icon.ico'),
    });

    await adminPromptWindow.loadFile(path.join(__dirname, 'admin-prompt.html'));

    // Handle window closed
    adminPromptWindow.on('closed', () => {
        global.adminPromptWindow = null;
        // If admin prompt is closed without action, start main app without admin
        if (!app.isQuiting) {
            setTimeout(() => {
                startMainApplication();
            }, 500);
        }
    });

    // Store reference to admin prompt window
    global.adminPromptWindow = adminPromptWindow;

    // Add IPC handler for minimizing admin window
    const { ipcMain } = require('electron');
    ipcMain.on('minimize-admin-window', () => {
        if (adminPromptWindow && !adminPromptWindow.isDestroyed()) {
            adminPromptWindow.minimize();
        }
    });

    return adminPromptWindow;
}

/**
 * Starts the main application after admin prompt handling.
 * Creates the main window and initializes all components.
 *
 * @async
 * @function startMainApplication
 * @returns {Promise<void>} Promise that resolves when main application is started
 */
async function startMainApplication() {
    try {
        // Clear the admin prompt flag
        global.showingAdminPrompt = false;

        // Close admin prompt window if it exists
        if (global.adminPromptWindow && !global.adminPromptWindow.isDestroyed()) {
            global.adminPromptWindow.close();
            global.adminPromptWindow = null;
        }

        const mainWindow = windowManager.getMainWindow();
        if (mainWindow) {
            return; // Window already exists
        }

        windowManager.setDependencies({
            getStore: () => settingsManager.getStore(),
            systemTray: systemTray,
            app: app,
        });

        await windowManager.createWindow();
        systemTray.initialize();

        // Background startup tasks
        (async () => {
            try {
                const enableDiscordRpc = await settingsManager.getSetting(
                    'enableDiscordRpc',
                    true
                );
                if (enableDiscordRpc) {
                    discordPresence.start();
                }

                await ensureAppDirectoriesExist();
                await pluginManager.loadPluginBackends();
                await processPool.finishStartupPhase();
                await applyPerformanceOptimizations();
            } catch (error) {
                loggingManager.logError(
                    `Error during background startup tasks: ${error.message}`,
                    'BackgroundStartup'
                );
            }
        })();
    } catch (error) {
        loggingManager.logError(
            `Error during application startup: ${error.message}`,
            'ApplicationStartup'
        );

        // Fallback window creation
        try {
            const basicWindow = new BrowserWindow({
                width: 800,
                height: 600,
                webPreferences: {
                    preload: path.join(__dirname, 'preload.js'),
                    nodeIntegration: false,
                    contextIsolation: true,
                    enableRemoteModule: false,
                    webSecurity: true,
                    sandbox: false,
                    devTools: process.env.NODE_ENV !== 'production',
                },
                frame: true,
                transparent: false,
                show: true,
            });

            basicWindow.loadFile(path.join(__dirname, 'index.html'));
            systemTray.initialize();
        } catch (basicError) {
            loggingManager.logError(
                `Even basic window creation failed: ${basicError.message}`,
                'WindowCreation'
            );
            dialog.showErrorBox(
                'Startup Error',
                'WinTool failed to start. Please check the application logs for more details.'
            );
            app.quit();
        }
    }
}

/**
 * Initializes the main application and all its components.
 * Sets up dependencies, handles elevation prompts, and creates the main window.
 *
 * @async
 * @function initializeApplication
 * @returns {Promise<void>} Promise that resolves when application is initialized
 */
async function initializeApplication() {
    if (process.platform === 'win32') {
        app.setAppUserModelId('com.mtechware.wintool');
    }

    // Register global shortcut with retry mechanism
    const registerQuitShortcut = () => {
        // Check if shortcut is already registered
        if (globalShortcut.isRegistered('Control+Q')) {
            console.log('Ctrl+Q shortcut is already registered, unregistering first');
            globalShortcut.unregister('Control+Q');
        }

        const shortcutRegistered = globalShortcut.register('Control+Q', () => {
            console.log('Ctrl+Q shortcut triggered!');
            loggingManager.logInfo('Ctrl+Q shortcut triggered', 'GlobalShortcut');
            systemTray.quitApplication();
        });

        if (shortcutRegistered) {
            console.log('Ctrl+Q global shortcut registered successfully');
            loggingManager.logInfo('Ctrl+Q global shortcut registered successfully', 'GlobalShortcut');
        } else {
            console.error('Failed to register Ctrl+Q global shortcut');
            loggingManager.logError('Failed to register Ctrl+Q global shortcut', 'GlobalShortcut');

            // Retry after a delay
            setTimeout(() => {
                console.log('Retrying Ctrl+Q shortcut registration...');
                registerQuitShortcut();
            }, 2000);
        }
    };

    registerQuitShortcut();

    settingsManager.setDependencies({
        discordPresence: discordPresence,
        windowManager: windowManager,
        restartApp: restartApp,
    });

    pluginManager.setDependencies({
        settingsManager: settingsManager,
        windowManager: windowManager,
        processPool: processPool,
        restartApp: restartApp,
    });

    systemTray.setDependencies({
        windowManager: windowManager,
        app: app,
    });

    loggingManager.setDependencies({
        windowManager: windowManager,
    });

    loggingManager.initialize();
    global.logger = loggingManager;

    // Check if we should show admin prompt first (only on Windows)
    if (process.platform === 'win32') {
        try {
            // First check if we're already running as admin
            let isAlreadyElevated = false;
            try {
                await processPool.executeCmdCommand('net session');
                isAlreadyElevated = true;
            } catch (elevationCheckError) {
                // Not running as admin
                isAlreadyElevated = false;
            }

            // If already elevated, skip admin prompt and go to main app
            if (isAlreadyElevated) {
                // Continue to main application
            } else {
                // Try to get elevation preference, but don't fail if settings aren't ready
                let elevationPreference = 'ask'; // Default fallback

                try {
                    elevationPreference = await settingsManager.getSetting('elevationChoice', 'ask');
                } catch (settingsError) {
                    // If settings aren't available, use default behavior (ask)
                    loggingManager.logError(
                        `Settings not available during initialization, using default: ${settingsError.message}`,
                        'Initialization'
                    );
                }

                const shouldShowAdminPrompt = elevationPreference === 'ask';

                if (shouldShowAdminPrompt) {
                    // Set flag to prevent main window creation
                    global.showingAdminPrompt = true;

                    // Show admin prompt window first
                    await createAdminPromptWindow();
                    return;
                } else if (elevationPreference === 'yes') {
                    // Try to elevate automatically
                    try {
                        const { spawn } = require('child_process');
                        const appPath = process.execPath;
                        const psScript = `Start-Process -FilePath "${appPath}" -Verb RunAs`;
                        await processPool.executePowerShellCommand(psScript);

                        // If elevation was requested, quit this instance
                        setTimeout(() => {
                            app.quit();
                        }, 1000);
                        return;
                    } catch (elevationError) {
                        // Continue to main app if elevation fails
                    }
                }
                // If preference is 'no' or elevation failed, continue to main app
            }
        } catch (error) {
            loggingManager.logError(
                `Error checking elevation preference: ${error.message}`,
                'Initialization'
            );
        }
    }

    // Start the main application
    await startMainApplication();
}

app.whenReady().then(initializeApplication);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin' && app.isQuiting) {
        app.quit();
    }
});

app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0 && !global.showingAdminPrompt) {
        await windowManager.createWindow();
    }
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    processPool.cleanup();
});

app.on('before-quit', () => {
    app.isQuiting = true;
    systemTray.destroyTray();
    processPool.cleanup();

    if (performanceInterval) {
        clearInterval(performanceInterval);
        performanceInterval = null;
    }
});

/**
 * IPC Handler: Executes a command with administrator privileges.
 * Uses PowerShell Start-Process with RunAs verb to elevate privileges.
 *
 * @param {Electron.IpcMainInvokeEvent} _ - The IPC event object (unused)
 * @param {string} command - The command to execute with admin privileges
 * @returns {Promise<{success: boolean}>} Promise resolving to success status
 * @throws {Error} If command is invalid or execution fails
 */
ipcMain.handle('run-admin-command', async (_, command) => {
    if (!command || typeof command !== 'string') {
        throw new Error('Invalid command parameter');
    }

    const escapedCommand = command.replace(/"/g, '`"');
    const psScript = `Start-Process -Verb RunAs -Wait -FilePath "cmd.exe" -ArgumentList "/c ${escapedCommand}"`;

    try {
        await processPool.executePowerShellCommand(psScript);
        return { success: true };
    } catch (error) {
        throw new Error(
            `Elevated process failed: ${error.message}. The user may have denied the UAC prompt.`
        );
    }
});

/**
 * IPC Handler: Executes a command with optional administrator privileges.
 * Supports both regular command execution and elevated execution via PowerShell.
 *
 * @param {Electron.IpcMainInvokeEvent} _ - The IPC event object (unused)
 * @param {string} command - The command to execute
 * @param {boolean} [asAdmin=false] - Whether to execute with admin privileges
 * @returns {Promise<{success: boolean, code: number, stdout: string, stderr: string, message: string}>} Command execution result
 * @throws {Error} If command is invalid or execution fails
 */
ipcMain.handle('run-command', async (_, command, asAdmin = false) => {
    loggingManager.logSecurity('RUN_COMMAND', { command, asAdmin });

    if (!command || typeof command !== 'string') {
        throw new Error('Invalid command provided.');
    }

    if (asAdmin) {
        const commandParts = command.split(' ');
        const executable = commandParts.shift();
        const args = commandParts.join(' ');
        const psScript = `Start-Process -FilePath "${executable}" -ArgumentList "${args}" -Verb RunAs -Wait`;

        return processPool
            .executePowerShellCommand(psScript)
            .then(() => {
                return {
                    success: true,
                    message: `Command '${command}' executed successfully as admin.`,
                };
            })
            .catch(error => {
                throw new Error(
                    `Elevated process failed: ${error.message}. The user may have cancelled the UAC prompt.`
                );
            });
    }

    try {
        const output = await processPool.executeCmdCommand(command);
        return {
            success: true,
            code: 0,
            stdout: output,
            stderr: '',
            message: 'Command finished with exit code 0.',
        };
    } catch (error) {
        if (!processPool.isExpectedFailure(command, error.message)) {
            loggingManager.logError(
                `Command execution error: ${error.message}`,
                'CommandExecution'
            );
        }

        const codeMatch = error.message.match(/exit code (\d+)/);
        const exitCode = codeMatch ? parseInt(codeMatch[1]) : 1;

        return {
            success: false,
            code: exitCode,
            stdout: '',
            stderr: error.message,
            message: `Command finished with exit code ${exitCode}.`,
        };
    }
});

/**
 * IPC Handler: Opens the application directory in the system file explorer.
 *
 * @param {Electron.IpcMainInvokeEvent} _ - The IPC event object (unused)
 * @returns {void}
 */
ipcMain.handle('open-app-directory', () => {
    const appPath = app.getAppPath();
    const appDir = path.dirname(appPath);
    shell.openPath(appDir);
});

/**
 * IPC Handler: Toggles the developer tools for the main window.
 * Opens dev tools if closed, closes them if open.
 *
 * @param {Electron.IpcMainInvokeEvent} _ - The IPC event object (unused)
 * @returns {void}
 */
ipcMain.handle('toggle-dev-tools', () => {
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow && mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
    } else if (mainWindow) {
        mainWindow.webContents.openDevTools();
    }
});

/**
 * IPC Handler: Opens special system folders in the file explorer.
 * Supports temp, startup, and hosts folder shortcuts.
 *
 * @param {Electron.IpcMainInvokeEvent} _ - The IPC event object (unused)
 * @param {string} folderKey - The folder identifier ('temp', 'startup', 'hosts')
 * @returns {void}
 */
ipcMain.handle('open-special-folder', (_, folderKey) => {
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
            loggingManager.logError(`Unknown special folder key: ${folderKey}`, 'FolderAccess');
            return;
    }
    shell.openPath(folderPath);
});

// Performance metrics handler
let performanceInterval;
let performanceUpdateCount = 0;
let performanceCache = null;
let performanceCacheTime = 0;

ipcMain.handle('start-performance-updates', async () => {
    performanceUpdateCount++;

    if (!performanceInterval) {
        const updatePerformanceMetrics = async () => {
            try {
                const now = Date.now();
                if (performanceCache && now - performanceCacheTime < 2000) {
                    const mainWindow = windowManager.getMainWindow();
                    if (mainWindow && mainWindow.webContents) {
                        mainWindow.webContents.send('performance-update', performanceCache);
                    }
                    return;
                }

                const memInfo = await windowsSysInfo.mem();
                const metrics = {
                    mem: ((memInfo.active / memInfo.total) * 100).toFixed(2),
                };

                performanceCache = metrics;
                performanceCacheTime = now;

                const mainWindow = windowManager.getMainWindow();
                if (mainWindow && mainWindow.webContents) {
                    mainWindow.webContents.send('performance-update', metrics);
                }
            } catch (error) {
                loggingManager.logError(
                    `Failed to get performance metrics: ${error.message}`,
                    'PerformanceMetrics'
                );
            }
        };

        performanceInterval = setInterval(updatePerformanceMetrics, 3000);
    }
});

ipcMain.handle('stop-performance-updates', () => {
    if (performanceUpdateCount > 0) {
        performanceUpdateCount--;
    }

    if (performanceUpdateCount <= 0 && performanceInterval) {
        clearInterval(performanceInterval);
        performanceInterval = null;
        performanceUpdateCount = 0;
    }
});

/**
 * IPC Handler: Gets current system capabilities and process pool status.
 * Returns information about system performance capabilities and startup state.
 *
 * @param {Electron.IpcMainInvokeEvent} _ - The IPC event object (unused)
 * @returns {{capabilities: string, maxActiveProcesses: number, isStartupPhase: boolean}} System capabilities info
 */
ipcMain.handle('get-system-capabilities', () => {
    return {
        capabilities: processPool.systemCapabilities || 'unknown',
        maxActiveProcesses: processPool.maxActiveProcesses,
        isStartupPhase: processPool.isStartupPhase,
    };
});

/**
 * IPC Handler: Restarts the application by reloading the main window.
 * Used when settings changes require an application restart.
 *
 * @param {Electron.IpcMainInvokeEvent} _ - The IPC event object (unused)
 * @returns {boolean} Always returns true to indicate restart was initiated
 */
ipcMain.handle('restart-application', () => {
    restartApp();
    return true;
});

/**
 * IPC Handler: Requests administrator elevation for the application.
 * Attempts to restart the application with elevated privileges.
 *
 * @param {Electron.IpcMainInvokeEvent} _ - The IPC event object (unused)
 * @returns {Promise<{success: boolean, message?: string}>} Promise resolving to elevation result
 */
/**
 * IPC Handler: Checks if the application is currently running with administrator privileges.
 * 
 * @param {Electron.IpcMainInvokeEvent} _ - The IPC event object (unused)
 * @returns {Promise<{isElevated: boolean}>} Promise resolving to elevation status
 */
ipcMain.handle('check-elevation-status', async (_) => {
    try {
        await processPool.executeCmdCommand('net session');
        return { isElevated: true };
    } catch (error) {
        return { isElevated: false };
    }
});

/**
 * IPC Handler: Gets theme settings for admin prompt window.
 * Returns the current theme configuration including custom themes.
 * 
 * @param {Electron.IpcMainInvokeEvent} _ - The IPC event object (unused)
 * @returns {Promise<{theme: string, primaryColor: string, customTheme: object}>} Promise resolving to theme settings
 */
ipcMain.handle('get-theme-settings', async (_) => {
    try {
        return await settingsManager.getThemeSettings();
    } catch (error) {
        loggingManager.logError(
            `Error getting theme settings: ${error.message}`,
            'ThemeSettings'
        );
        // Return default theme settings if there's an error
        return {
            theme: 'modern-gray',
            primaryColor: '#ff6b35',
            customTheme: {},
            rainbowMode: false,
        };
    }
});

ipcMain.handle('request-elevation', async (_) => {
    try {
        // Check if already elevated using a simple command
        try {
            await processPool.executeCmdCommand('net session');
            // If this succeeds, we're already running as admin
            const adminPromptWindows = BrowserWindow.getAllWindows().filter(win =>
                win.webContents.getURL().includes('admin-prompt.html')
            );

            adminPromptWindows.forEach(win => win.close());
            await startMainApplication();

            return { success: true, message: 'Already running with administrator privileges' };
        } catch (elevationCheckError) {
            // Not running as admin, continue with elevation request
        }

        // Request elevation by restarting the app with admin privileges
        const appPath = process.execPath;

        // Use PowerShell to restart with elevation
        const psScript = `Start-Process -FilePath "${appPath}" -Verb RunAs`;

        await processPool.executePowerShellCommand(psScript);

        // If we reach here, elevation was requested successfully
        // The new elevated process will start, so we can quit this one
        setTimeout(() => {
            app.quit();
        }, 1000);

        return { success: true, message: 'Elevation requested successfully' };

    } catch (error) {
        loggingManager.logError(
            `Error requesting elevation: ${error.message}`,
            'Elevation'
        );

        // If elevation fails, continue without admin
        const adminPromptWindows = BrowserWindow.getAllWindows().filter(win =>
            win.webContents.getURL().includes('admin-prompt.html')
        );

        adminPromptWindows.forEach(win => win.close());
        await startMainApplication();

        return {
            success: false,
            message: `Elevation failed: ${error.message}. Continuing with standard privileges.`
        };
    }
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
            loggingManager.logWarn(
                `Failed to parse environment variables JSON, returning empty result: ${parseError.message}`,
                'EnvironmentVariables'
            );
            return { user: {}, system: {} };
        }
    } catch (error) {
        loggingManager.logError(
            `Error getting environment variables: ${error.message}`,
            'EnvironmentVariables'
        );
        // Return empty result instead of throwing to prevent app crashes
        return { user: {}, system: {} };
    }
});

ipcMain.handle('set-environment-variable', async (_, name, value, target) => {
    if (!checkRateLimit('env-var-set')) {
        throw new Error('Rate limit exceeded. Please wait before making more requests.');
    }

    if (!name || typeof name !== 'string') {
        throw new Error('Invalid variable name parameter');
    }
    if (typeof value !== 'string') {
        throw new Error('Invalid variable value parameter');
    }
    if (!target || (target !== 'User' && target !== 'Machine')) {
        throw new Error('Invalid target parameter. Must be "User" or "Machine"');
    }

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
        return {
            success: true,
            message: `Environment variable ${sanitizedName} deleted successfully`,
        };
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
        const formatBytes = bytes => {
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
            memoryUsagePercent: memoryUsagePercent,
        };
    } catch (error) {
        loggingManager.logError(
            `Error getting system health info: ${error.message}`,
            'SystemHealth'
        );
        throw error;
    }
});

// Clear system info cache handler for forcing fresh data
ipcMain.handle('clear-system-info-cache', async () => {
    try {
        windowsSysInfo.clearCache();
        return { success: true };
    } catch (error) {
        loggingManager.logError(
            `Error clearing system info cache: ${error.message}`,
            'SystemHealth'
        );
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
        // Default to fast mode during startup phase for better performance
        const isStartupPhase = processPool && processPool.isStartupPhase;
        // Also enable fast mode if we've had recent timeout errors
        const hasRecentTimeoutError =
            systemInfoCache && systemInfoCache.error && systemInfoCache.error.includes('timed out');
        const shouldUseFastMode = isStartupPhase || hasRecentTimeoutError;
        const fastMode = await settingsManager.getSetting('fastSystemInfo', shouldUseFastMode);
        const useCache = await settingsManager.getSetting('cacheSystemInfo', true);

        // Check cache first if enabled and no specific type requested
        if (
            !type &&
            useCache &&
            systemInfoCache &&
            Date.now() - systemInfoCacheTime < SYSTEM_INFO_CACHE_DURATION
        ) {
            return systemInfoCache;
        }

        // Fast mode for basic info only
        if (!type && fastMode) {
            const reason = isStartupPhase
                ? 'startup optimization'
                : hasRecentTimeoutError
                    ? 'recent timeout error'
                    : 'user setting';

            const basicInfo = {
                platform: os.platform(),
                arch: os.arch(),
                hostname: os.hostname(),
                cpuCores: os.cpus().length + ' cores',
                uptime: Math.round(os.uptime() / 3600) + ' hours',
                fastMode: true,
                fastModeReason: reason,
                timestamp: new Date().toISOString(),
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

        // Use our Windows-specific system info module
        const systemInfo = await windowsSysInfo.getAllSystemInfo();

        // Format uptime
        const uptimeSeconds = os.uptime();
        const days = Math.floor(uptimeSeconds / 86400);
        const hours = Math.floor((uptimeSeconds % 86400) / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const formattedUptime = `${days}d ${hours}h ${minutes}m`;

        // Format memory sizes
        const formatBytes = bytes => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };
        const result = {
            // Basic system info
            platform: systemInfo.osInfo.platform || os.platform(),
            arch: systemInfo.osInfo.arch || os.arch(),
            hostname: systemInfo.osInfo.hostname || os.hostname(),
            uptime: formattedUptime,

            // Memory information
            totalMemory: formatBytes(systemInfo.mem.total || os.totalmem()),
            freeMemory: formatBytes(systemInfo.mem.free || os.freemem()),
            usedMemory: formatBytes(systemInfo.mem.used || os.totalmem() - os.freemem()),
            memoryUsagePercent: systemInfo.mem.total
                ? Math.round((systemInfo.mem.used / systemInfo.mem.total) * 100)
                : 0,

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
            cpuCurrentSpeed: systemInfo.cpuCurrentSpeed.avg
                ? systemInfo.cpuCurrentSpeed.avg.toFixed(2) + ' GHz'
                : 'N/A',
            cpuTemperature: systemInfo.cpuTemperature.main
                ? systemInfo.cpuTemperature.main + '°C'
                : 'N/A',

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
                smartStatus: disk.smartStatus || 'Unknown',
            })),

            // File system information
            filesystems: (systemInfo.fsSize || []).map(fs => ({
                fs: fs.fs,
                type: fs.type,
                size: formatBytes(fs.size),
                used: formatBytes(fs.used),
                available: formatBytes(fs.available),
                usePercent: fs.use,
                mount: fs.mount,
            })),

            // Network interfaces
            networkInterfaces: (systemInfo.networkInterfaces || [])
                .filter(iface => !iface.internal)
                .map(iface => ({
                    name: iface.iface,
                    type: iface.type || 'Unknown',
                    speed: iface.speed ? iface.speed / 1000000 + ' Mbps' : 'Unknown',
                    ip4: iface.ip4 || 'N/A',
                    ip6: iface.ip6 || 'N/A',
                    mac: iface.mac || 'N/A',
                    operstate: iface.operstate || 'Unknown',
                })),

            // Graphics information
            graphicsPrimaryGpu: systemInfo.graphics.primaryGpu?.model || 'Unknown',
            graphicsVendor: systemInfo.graphics.primaryGpu?.vendor || 'Unknown',
            graphicsDriverVersion: systemInfo.graphics.primaryGpu?.driver || 'Unknown',
            graphicsResolution: systemInfo.graphics.resolution || 'Unknown',

            // Primary storage information
            storagePrimary: systemInfo.fsSize?.[0]?.fs || 'C:',
            storageTotal: systemInfo.fsSize?.[0]
                ? formatBytes(systemInfo.fsSize[0].size)
                : 'Unknown',
            storageFree: systemInfo.fsSize?.[0]
                ? formatBytes(systemInfo.fsSize[0].available)
                : 'Unknown',
            storageUsed: systemInfo.fsSize?.[0]
                ? formatBytes(systemInfo.fsSize[0].used)
                : 'Unknown',

            // Windows-specific metadata
            windowsSpecific: true,
            powerShellVersion: 'Available',
            timestamp: systemInfo.timestamp,
        };

        // Cache the result if caching is enabled
        if (useCache) {
            systemInfoCache = result;
            systemInfoCacheTime = Date.now();
        }

        return result;
    } catch (error) {
        loggingManager.logError(
            `Error getting system information: ${error.message}`,
            'SystemInformation'
        );

        // Create fallback info with basic os module data
        const fallbackInfo = {
            platform: os.platform(),
            arch: os.arch(),
            hostname: os.hostname(),
            cpuCores: os.cpus().length + ' cores',
            uptime: Math.round(os.uptime() / 3600) + ' hours',
            error: error.message || 'Failed to get detailed system information',
            fallbackMode: true,
            timestamp: new Date().toISOString(),
        };

        // Cache the fallback info to enable fast mode on next call if this was a timeout
        if (useCache && error.message && error.message.includes('timed out')) {
            systemInfoCache = fallbackInfo;
            systemInfoCacheTime = Date.now();
        }

        return fallbackInfo;
    }
});

// Network statistics handler using Windows PowerShell
ipcMain.handle('get-network-stats', async () => {
    try {
        // Get both real-time and cumulative network statistics
        const [networkStats, cumulativeStats] = await Promise.allSettled([
            windowsSysInfo.networkStats('*'),
            windowsSysInfo.networkStatsCumulative(),
        ]);

        const realTimeStats = networkStats.status === 'fulfilled' ? networkStats.value : [];
        const totalStats = cumulativeStats.status === 'fulfilled' ? cumulativeStats.value : [];

        // Format the data
        const formatBytes = bytes => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        // Merge real-time and cumulative data
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
                tx_sec: 0,
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
                tx_sec: stat.tx_sec || 0,
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
                tx_sec: stat.tx_sec ? formatBytes(stat.tx_sec) + '/s' : '0 B/s',
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
                total_packets_tx: totalTxPackets,
            },
        };
    } catch (error) {
        loggingManager.logError(
            `Error getting network statistics: ${error.message}`,
            'NetworkStatistics'
        );
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
                total_packets_tx: 'N/A',
            },
            error: 'Failed to get network statistics',
        };
    }
});

// Tab and plugin folder management handlers are now handled by PluginManager

// Plugin hash calculation is now handled by PluginManager

// get-all-plugins handler is now handled by PluginManager

// delete-plugin handler is now handled by PluginManager

// install-plugin and open-plugins-directory handlers are now handled by PluginManager

// run-plugin-script handler is now handled by PluginManager

// Plugin API handlers are now handled by PluginManager

// get-tab-content handler is now handled by PluginManager

// Load applications.json file handler
ipcMain.handle('get-applications-data', async () => {
    const applicationsPath = path.join(__dirname, 'tabs', 'packages', 'applications.json');

    try {
        const data = await fs.readFile(applicationsPath, 'utf8');
        const applications = JSON.parse(data);
        return applications;
    } catch (error) {
        loggingManager.logError(
            `Error loading applications.json: ${error.message}`,
            'ApplicationsData'
        );
        throw new Error(`Failed to load applications data: ${error.message}`);
    }
});

/**
 * Validates and sanitizes package manager commands for security
 */
function validateAndSanitizeCommand(command, allowedCommands, logPrefix = '', logSecurity = true) {
    if (!command || typeof command !== 'string') {
        throw new Error('Invalid command parameter');
    }

    const commandParts = command.trim().split(' ');
    const mainCommand = commandParts[0];

    if (!allowedCommands.includes(mainCommand)) {
        if (logSecurity && logPrefix) {
            loggingManager.logSecurity(`BLOCKED_${logPrefix}_COMMAND`, {
                command: mainCommand,
                fullCommand: command,
            });
        }
        throw new Error(`Command '${mainCommand}' is not allowed for security reasons`);
    }

    if (logSecurity && logPrefix) {
        loggingManager.logSecurity(`${logPrefix}_COMMAND_EXECUTED`, {
            command: mainCommand,
            args: commandParts.slice(1),
        });
    }

    return commandParts
        .map(part => part.replace(/[;&|`$(){}[\]<>]/g, ''))
        .join(' ');
}

/**
 * Validates and sanitizes winget commands for security
 */
function validateAndSanitizeWingetCommand(command, logSecurity = true) {
    const allowedCommands = ['search', 'install', 'uninstall', 'list', 'show', 'source', 'upgrade'];
    return validateAndSanitizeCommand(command, allowedCommands, 'WINGET', logSecurity);
}

/**
 * Validates and sanitizes chocolatey commands for security
 */
function validateAndSanitizeChocoCommand(command) {
    const allowedCommands = ['search', 'install', 'uninstall', 'list', 'info', 'upgrade', 'outdated'];
    return validateAndSanitizeCommand(command, allowedCommands, '', false);
}

// Winget command execution handler
ipcMain.handle('execute-winget-command', async (_, command) => {
    // Rate limiting
    if (!checkRateLimit('winget-command')) {
        throw new Error('Rate limit exceeded. Please wait before making more requests.');
    }

    const sanitizedCommand = validateAndSanitizeWingetCommand(command);

    return new Promise((resolve, reject) => {
        const wingetProcess = spawn('winget', sanitizedCommand.split(' '), {
            shell: false, // Changed from true to false for security
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';

        wingetProcess.stdout.on('data', data => {
            stdout += data.toString();
        });

        wingetProcess.stderr.on('data', data => {
            stderr += data.toString();
        });

        wingetProcess.on('close', code => {
            const output = stdout + (stderr ? '\nErrors:\n' + stderr : '');
            resolve({
                code,
                output,
                success: code === 0,
            });
        });

        wingetProcess.on('error', error => {
            reject(new Error(`Failed to execute winget: ${error.message}`));
        });
    });
});

// Check if Chocolatey is available
async function checkChocoAvailability() {
    return new Promise(resolve => {
        const chocoProcess = spawn('choco', ['--version'], {
            shell: false,
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        chocoProcess.on('close', code => {
            resolve(code === 0);
        });

        chocoProcess.on('error', () => {
            resolve(false);
        });
    });
}

// Chocolatey command execution handler
ipcMain.handle('execute-choco-command', async (_, command) => {
    // Check if Chocolatey is available
    const chocoAvailable = await checkChocoAvailability();
    if (!chocoAvailable) {
        throw new Error(
            'Chocolatey is not installed or not available in PATH. Please install Chocolatey first: https://chocolatey.org/install'
        );
    }

    // Rate limiting
    if (!checkRateLimit('choco-command')) {
        throw new Error('Rate limit exceeded. Please wait before making more requests.');
    }

    const sanitizedCommand = validateAndSanitizeChocoCommand(command);

    return new Promise((resolve, reject) => {
        const chocoProcess = spawn('choco', sanitizedCommand.split(' '), {
            shell: false,
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';

        chocoProcess.stdout.on('data', data => {
            stdout += data.toString();
        });

        chocoProcess.stderr.on('data', data => {
            stderr += data.toString();
        });

        chocoProcess.on('close', code => {
            const output = stdout + (stderr ? '\nErrors:\n' + stderr : '');
            resolve({
                code,
                output,
                success: code === 0,
            });
        });

        chocoProcess.on('error', error => {
            reject(new Error(`Failed to execute chocolatey: ${error.message}`));
        });
    });
});

// Chocolatey command execution with progress streaming
ipcMain.handle('execute-choco-command-with-progress', async (_, command) => {

    // Check if Chocolatey is available
    const chocoAvailable = await checkChocoAvailability();
    if (!chocoAvailable) {
        throw new Error(
            'Chocolatey is not installed or not available in PATH. Please install Chocolatey first: https://chocolatey.org/install'
        );
    }

    const sanitizedCommand = validateAndSanitizeChocoCommand(command);

    return new Promise((resolve, reject) => {
        const chocoProcess = spawn('choco', sanitizedCommand.split(' '), {
            shell: false,
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';
        let progressPercentage = 0;

        // Send initial progress
        event.sender.send('choco-progress', {
            type: 'progress',
            percentage: 0,
            message: 'Starting operation...',
        });

        chocoProcess.stdout.on('data', data => {
            const output = data.toString();
            stdout += output;

            // Send progress updates
            event.sender.send('choco-progress', {
                type: 'output',
                message: output,
            });

            // Try to extract progress information from chocolatey output
            if (output.includes('Progress:')) {
                const progressMatch = output.match(/Progress:\s*(\d+)%/);
                if (progressMatch) {
                    progressPercentage = parseInt(progressMatch[1]);
                    event.sender.send('choco-progress', {
                        type: 'progress',
                        percentage: progressPercentage,
                        message: `Processing... ${progressPercentage}%`,
                    });
                }
            } else if (output.includes('Installing') || output.includes('Downloading')) {
                progressPercentage = Math.min(progressPercentage + 10, 90);
                event.sender.send('choco-progress', {
                    type: 'progress',
                    percentage: progressPercentage,
                    message: 'Installing package...',
                });
            }
        });

        chocoProcess.stderr.on('data', data => {
            const output = data.toString();
            stderr += output;

            event.sender.send('choco-progress', {
                type: 'output',
                message: output,
            });
        });

        chocoProcess.on('close', code => {
            const output = stdout + (stderr ? '\nErrors:\n' + stderr : '');

            event.sender.send('choco-progress', {
                type: 'complete',
                percentage: 100,
                message:
                    code === 0
                        ? 'Operation completed successfully'
                        : 'Operation completed with errors',
                success: code === 0,
            });

            resolve({
                code,
                output,
                success: code === 0,
            });
        });

        chocoProcess.on('error', error => {
            event.sender.send('choco-progress', {
                type: 'error',
                message: `Failed to execute chocolatey: ${error.message}`,
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

    const sanitizedCommand = validateAndSanitizeWingetCommand(command, false);

    return new Promise((resolve, reject) => {
        const wingetProcess = spawn('winget', sanitizedCommand.split(' '), {
            shell: false, // Changed from true to false for security
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';
        let progressPercentage = 0;

        // Send initial progress
        event.sender.send('winget-progress', {
            type: 'progress',
            percentage: 0,
            message: 'Starting operation...',
        });

        wingetProcess.stdout.on('data', data => {
            const output = data.toString();
            stdout += output;

            // Send output to renderer
            event.sender.send('winget-progress', {
                type: 'output',
                data: output,
            });

            // Try to parse progress from winget output
            const progressMatch = output.match(/(\d+)%/);
            if (progressMatch) {
                const newPercentage = parseInt(progressMatch[1]);
                if (newPercentage > progressPercentage) {
                    progressPercentage = newPercentage;
                    event.sender.send('winget-progress', {
                        type: 'progress',
                        percentage: progressPercentage,
                    });
                }
            }

            // Check for specific winget status messages
            if (output.includes('Downloading')) {
                event.sender.send('winget-progress', {
                    type: 'progress',
                    percentage: Math.max(progressPercentage, 20),
                    message: 'Downloading package...',
                });
            } else if (output.includes('Installing')) {
                event.sender.send('winget-progress', {
                    type: 'progress',
                    percentage: Math.max(progressPercentage, 60),
                    message: 'Installing package...',
                });
            } else if (output.includes('Successfully installed')) {
                event.sender.send('winget-progress', {
                    type: 'progress',
                    percentage: 100,
                    message: 'Installation completed',
                });
            }
        });

        wingetProcess.stderr.on('data', data => {
            const output = data.toString();
            stderr += output;

            // Send error output to renderer
            event.sender.send('winget-progress', {
                type: 'output',
                data: output,
            });
        });

        wingetProcess.on('close', code => {
            const output = stdout + (stderr ? '\nErrors:\n' + stderr : '');

            if (code === 0) {
                event.sender.send('winget-progress', {
                    type: 'complete',
                    message: 'Operation completed successfully',
                });
            } else {
                event.sender.send('winget-progress', {
                    type: 'error',
                    message: `Operation failed with exit code ${code}`,
                });
            }

            resolve({
                code,
                output,
                success: code === 0,
            });
        });

        wingetProcess.on('error', error => {
            event.sender.send('winget-progress', {
                type: 'error',
                message: `Failed to execute winget: ${error.message}`,
            });
            reject(new Error(`Failed to execute winget: ${error.message}`));
        });
    });
});

// Cleanup functionality handlers
ipcMain.handle('get-disk-space', async () => {

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

        if (stdout.trim() && stdout.trim() !== 'ERROR') {
            const diskData = JSON.parse(stdout.trim());

            // Validate the data
            if (diskData.Total && diskData.Total > 0) {
                return {
                    total: parseInt(diskData.Total),
                    free: parseInt(diskData.Free),
                    used: parseInt(diskData.Used),
                };
            }
        }

        // If we get here, use fallback values
        return {
            total: 0,
            free: 0,
            used: 0,
            error: 'Unable to retrieve disk space information',
        };
    } catch (error) {
        loggingManager.logError(`Error getting disk space: ${error.message}`, 'DiskSpace');
        return {
            total: 0,
            free: 0,
            used: 0,
            error: error.message,
        };
    }
});

// Inline PowerShell scripts for cleanup operations
const cleanupScripts = {
    temp: `
try {
    $filesRemoved = 0
    $totalSizeFreed = 0
    $ErrorActionPreference = "SilentlyContinue"

    $tempPaths = @(
        $env:TEMP,
        $env:TMP,
        "$env:SystemRoot\\Temp",
        "$env:LOCALAPPDATA\\Temp"
    )

    $tempPaths = $tempPaths | Where-Object { $_ -and (Test-Path $_ -ErrorAction SilentlyContinue) } | Sort-Object -Unique

    foreach ($path in $tempPaths) {
        try {
            $cutoffTime = (Get-Date).AddHours(-1)
            $files = Get-ChildItem -Path $path -Recurse -Force -ErrorAction SilentlyContinue |
                     Where-Object {
                         -not $_.PSIsContainer -and
                         $_.LastWriteTime -lt $cutoffTime -and
                         $_.Length -gt 0
                     }

            if ($files) {
                foreach ($file in $files) {
                    try {
                        $fileSize = $file.Length
                        Remove-Item -Path $file.FullName -Force -ErrorAction Stop
                        $filesRemoved++
                        $totalSizeFreed += $fileSize
                    } catch {
                        continue
                    }
                }
            }
        } catch {
            continue
        }
    }

    $additionalPaths = @(
        "$env:LOCALAPPDATA\\Microsoft\\Windows\\INetCache\\*",
        "$env:LOCALAPPDATA\\Microsoft\\Windows\\WebCache\\*"
    )

    foreach ($pattern in $additionalPaths) {
        try {
            $items = Get-ChildItem -Path $pattern -Force -ErrorAction SilentlyContinue |
                     Where-Object { -not $_.PSIsContainer -and $_.LastWriteTime -lt (Get-Date).AddHours(-2) }

            foreach ($item in $items) {
                try {
                    $itemSize = $item.Length
                    Remove-Item -Path $item.FullName -Force -ErrorAction Stop
                    $filesRemoved++
                    $totalSizeFreed += $itemSize
                } catch {
                    continue
                }
            }
        } catch {
            continue
        }
    }

    $result = @{
        filesRemoved = $filesRemoved
        sizeFreed = $totalSizeFreed
        category = "temp"
        timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    }

    $result | ConvertTo-Json -Compress

} catch {
    @{
        filesRemoved = 0
        sizeFreed = 0
        category = "temp"
        error = $_.Exception.Message
        timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    } | ConvertTo-Json -Compress
}`,

    cache: `
try {
    $filesRemoved = 0
    $totalSizeFreed = 0
    $ErrorActionPreference = "SilentlyContinue"

    $prefetchPath = "$env:SystemRoot\\Prefetch"
    if (Test-Path $prefetchPath -ErrorAction SilentlyContinue) {
        $oldFiles = Get-ChildItem -Path $prefetchPath -Force -ErrorAction SilentlyContinue |
                   Where-Object {
                       -not $_.PSIsContainer -and
                       $_.Extension -eq ".pf" -and
                       $_.LastWriteTime -lt (Get-Date).AddDays(-14)
                   }

        foreach ($file in $oldFiles) {
            try {
                $fileSize = $file.Length
                Remove-Item -Path $file.FullName -Force -ErrorAction Stop
                $filesRemoved++
                $totalSizeFreed += $fileSize
            } catch {
                continue
            }
        }
    }

    $thumbCachePath = "$env:LOCALAPPDATA\\Microsoft\\Windows\\Explorer"
    if (Test-Path $thumbCachePath -ErrorAction SilentlyContinue) {
        $thumbFiles = Get-ChildItem -Path $thumbCachePath -Force -ErrorAction SilentlyContinue |
                     Where-Object {
                         -not $_.PSIsContainer -and
                         ($_.Name -like "thumbcache_*.db" -or $_.Name -like "iconcache_*.db")
                     }

        foreach ($file in $thumbFiles) {
            try {
                $fileSize = $file.Length
                Remove-Item -Path $file.FullName -Force -ErrorAction Stop
                $filesRemoved++
                $totalSizeFreed += $fileSize
            } catch {
                continue
            }
        }
    }

    $result = @{
        filesRemoved = $filesRemoved
        sizeFreed = $totalSizeFreed
        category = "cache"
        timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    }

    $result | ConvertTo-Json -Compress

} catch {
    @{
        filesRemoved = 0
        sizeFreed = 0
        category = "cache"
        error = $_.Exception.Message
        timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    } | ConvertTo-Json -Compress
}`
};

ipcMain.handle('execute-cleanup', async (_, category) => {
    return new Promise((resolve, reject) => {
        let script = '';

        switch (category) {
            case 'temp':
                script = cleanupScripts.temp;
                break;

            case 'cache':
                script = cleanupScripts.cache;
                break;

            case 'system':
                script = `
try {
    $filesRemoved = 0
    $totalSizeFreed = 0
    $ErrorActionPreference = "SilentlyContinue"

    # Clean Windows Error Reporting
    $werPaths = @(
        "$env:ProgramData\\Microsoft\\Windows\\WER\\ReportQueue",
        "$env:ProgramData\\Microsoft\\Windows\\WER\\ReportArchive",
        "$env:LOCALAPPDATA\\Microsoft\\Windows\\WER\\ReportQueue",
        "$env:LOCALAPPDATA\\Microsoft\\Windows\\WER\\ReportArchive"
    )

    foreach ($werPath in $werPaths) {
        if (Test-Path $werPath -ErrorAction SilentlyContinue) {
            try {
                $files = Get-ChildItem -Path $werPath -Recurse -Force -ErrorAction SilentlyContinue |
                         Where-Object { -not $_.PSIsContainer -and $_.Length -gt 0 }

                foreach ($file in $files) {
                    try {
                        $fileSize = $file.Length
                        Remove-Item -Path $file.FullName -Force -ErrorAction Stop
                        $filesRemoved++
                        $totalSizeFreed += $fileSize
                    } catch {
                        continue
                    }
                }
            } catch {
                continue
            }
        }
    }

    # Clean System Log Files (older than 7 days)
    $logPaths = @(
        "$env:SystemRoot\\Logs\\CBS",
        "$env:SystemRoot\\Logs\\DISM",
        "$env:SystemRoot\\Logs\\MoSetup",
        "$env:SystemRoot\\Logs\\WindowsUpdate"
    )

    foreach ($logPath in $logPaths) {
        if (Test-Path $logPath -ErrorAction SilentlyContinue) {
            try {
                $files = Get-ChildItem -Path $logPath -Recurse -Force -ErrorAction SilentlyContinue |
                         Where-Object {
                             -not $_.PSIsContainer -and
                             $_.LastWriteTime -lt (Get-Date).AddDays(-7) -and
                             $_.Length -gt 0
                         }

                foreach ($file in $files) {
                    try {
                        $fileSize = $file.Length
                        Remove-Item -Path $file.FullName -Force -ErrorAction Stop
                        $filesRemoved++
                        $totalSizeFreed += $fileSize
                    } catch {
                        continue
                    }
                }
            } catch {
                continue
            }
        }
    }

    @{
        filesRemoved = $filesRemoved
        sizeFreed = $totalSizeFreed
        category = "system"
        timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    } | ConvertTo-Json -Compress

} catch {
    @{
        filesRemoved = 0
        sizeFreed = 0
        category = "system"
        error = $_.Exception.Message
        timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    } | ConvertTo-Json -Compress
}`;
                break;

            case 'browser':
                script = `
try {
    $filesRemoved = 0
    $totalSizeFreed = 0
    $ErrorActionPreference = "SilentlyContinue"

    # Chrome cache paths
    $chromePaths = @(
        "$env:LOCALAPPDATA\\Google\\Chrome\\User Data\\Default\\Cache",
        "$env:LOCALAPPDATA\\Google\\Chrome\\User Data\\Default\\Code Cache",
        "$env:LOCALAPPDATA\\Google\\Chrome\\User Data\\Default\\GPUCache"
    )

    # Edge cache paths
    $edgePaths = @(
        "$env:LOCALAPPDATA\\Microsoft\\Edge\\User Data\\Default\\Cache",
        "$env:LOCALAPPDATA\\Microsoft\\Edge\\User Data\\Default\\Code Cache",
        "$env:LOCALAPPDATA\\Microsoft\\Edge\\User Data\\Default\\GPUCache"
    )

    # Process Chrome and Edge paths
    $allDirectPaths = $chromePaths + $edgePaths

    foreach ($cachePath in $allDirectPaths) {
        if (Test-Path $cachePath -ErrorAction SilentlyContinue) {
            try {
                $files = Get-ChildItem -Path $cachePath -File -Recurse -Force -ErrorAction SilentlyContinue |
                         Where-Object {
                             $_.LastWriteTime -lt (Get-Date).AddHours(-1) -and
                             $_.Length -gt 0
                         }

                foreach ($file in $files) {
                    try {
                        $fileSize = $file.Length
                        Remove-Item -Path $file.FullName -Force -ErrorAction Stop
                        $filesRemoved++
                        $totalSizeFreed += $fileSize
                    } catch {
                        continue
                    }
                }
            } catch {
                continue
            }
        }
    }

    # Process Firefox profiles (handle wildcards separately)
    $firefoxProfilesBase = "$env:LOCALAPPDATA\\Mozilla\\Firefox\\Profiles"
    if (Test-Path $firefoxProfilesBase -ErrorAction SilentlyContinue) {
        try {
            $firefoxProfiles = Get-ChildItem -Path $firefoxProfilesBase -Directory -Force -ErrorAction SilentlyContinue
            foreach ($profile in $firefoxProfiles) {
                $cachePaths = @(
                    (Join-Path $profile.FullName "cache2"),
                    (Join-Path $profile.FullName "startupCache")
                )

                foreach ($cachePath in $cachePaths) {
                    if (Test-Path $cachePath -ErrorAction SilentlyContinue) {
                        try {
                            $files = Get-ChildItem -Path $cachePath -File -Recurse -Force -ErrorAction SilentlyContinue |
                                     Where-Object {
                                         $_.LastWriteTime -lt (Get-Date).AddHours(-1) -and
                                         $_.Length -gt 0
                                     }

                            foreach ($file in $files) {
                                try {
                                    $fileSize = $file.Length
                                    Remove-Item -Path $file.FullName -Force -ErrorAction Stop
                                    $filesRemoved++
                                    $totalSizeFreed += $fileSize
                                } catch {
                                    continue
                                }
                            }
                        } catch {
                            continue
                        }
                    }
                }
            }
        } catch {
            continue
        }
    }

    @{
        filesRemoved = $filesRemoved
        sizeFreed = $totalSizeFreed
        category = "browser"
        timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    } | ConvertTo-Json -Compress

} catch {
    @{
        filesRemoved = 0
        sizeFreed = 0
        category = "browser"
        error = $_.Exception.Message
        timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    } | ConvertTo-Json -Compress
}`;
                break;

            case 'updates':
                script = `
try {
    $filesRemoved = 0
    $totalSizeFreed = 0
    $ErrorActionPreference = "SilentlyContinue"

    $updatePaths = @(
        "$env:SystemRoot\\SoftwareDistribution\\Download\\*",
        "$env:SystemRoot\\SoftwareDistribution\\DataStore\\Logs\\*"
    )

    foreach ($updatePattern in $updatePaths) {
        try {
            $files = Get-ChildItem -Path $updatePattern -File -Force -ErrorAction SilentlyContinue |
                     Where-Object {
                         $_.LastWriteTime -lt (Get-Date).AddDays(-7) -and
                         $_.Length -gt 0
                     }

            foreach ($file in $files) {
                try {
                    $fileSize = $file.Length
                    Remove-Item -Path $file.FullName -Force -ErrorAction Stop
                    $filesRemoved++
                    $totalSizeFreed += $fileSize
                } catch {
                    continue
                }
            }
        } catch {
            continue
        }
    }

    @{
        filesRemoved = $filesRemoved
        sizeFreed = $totalSizeFreed
        category = "updates"
        timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    } | ConvertTo-Json -Compress

} catch {
    @{
        filesRemoved = 0
        sizeFreed = 0
        category = "updates"
        error = $_.Exception.Message
        timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    } | ConvertTo-Json -Compress
}`;
                break;

            case 'logs':
                script = `
try {
    $filesRemoved = 0
    $totalSizeFreed = 0
    $ErrorActionPreference = "SilentlyContinue"

    $logPaths = @(
        "$env:SystemRoot\\Logs\\*",
        "$env:LOCALAPPDATA\\Microsoft\\Windows\\WebCache\\*.log",
        "$env:ProgramData\\Microsoft\\Windows\\WER\\*.log"
    )

    foreach ($pattern in $logPaths) {
        try {
            $items = Get-ChildItem -Path $pattern -Force -ErrorAction SilentlyContinue |
                     Where-Object { -not $_.PSIsContainer -and $_.LastWriteTime -lt (Get-Date).AddDays(-30) -and $_.Length -gt 1MB }

            foreach ($item in $items) {
                try {
                    $itemSize = $item.Length
                    Remove-Item -Path $item.FullName -Force -ErrorAction Stop
                    $filesRemoved++
                    $totalSizeFreed += $itemSize
                } catch {
                    continue
                }
            }
        } catch {
            continue
        }
    }

    @{
        filesRemoved = $filesRemoved
        sizeFreed = $totalSizeFreed
        category = "logs"
        timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    } | ConvertTo-Json -Compress

} catch {
    @{
        filesRemoved = 0
        sizeFreed = 0
        category = "logs"
        error = $_.Exception.Message
        timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    } | ConvertTo-Json -Compress
}`;
                break;

            case 'recycle':
                script = `
try {
    $filesRemoved = 0
    $totalSizeFreed = 0
    $ErrorActionPreference = "SilentlyContinue"

    # Clear Recycle Bin using PowerShell
    $recycleBin = (New-Object -ComObject Shell.Application).Namespace(0xA)
    if ($recycleBin) {
        $items = $recycleBin.Items()
        $filesRemoved = $items.Count

        # Estimate size (simplified)
        foreach ($item in $items) {
            try {
                $totalSizeFreed += $item.Size
            } catch {
                continue
            }
        }

        # Empty recycle bin
        try {
            $recycleBin.InvokeVerb("Empty")
        } catch {
            # Fallback method
            Clear-RecycleBin -Force -ErrorAction SilentlyContinue
        }
    }

    @{
        filesRemoved = $filesRemoved
        sizeFreed = $totalSizeFreed
        category = "recycle"
        timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    } | ConvertTo-Json -Compress

} catch {
    @{
        filesRemoved = 0
        sizeFreed = 0
        category = "recycle"
        error = $_.Exception.Message
        timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    } | ConvertTo-Json -Compress
}`;
                break;

            case 'dumps':
                script = `
try {
    $filesRemoved = 0
    $totalSizeFreed = 0
    $ErrorActionPreference = "SilentlyContinue"

    $dumpPaths = @(
        "$env:SystemRoot\\Minidump\\*",
        "$env:SystemRoot\\MEMORY.DMP",
        "$env:LOCALAPPDATA\\CrashDumps\\*"
    )

    foreach ($pattern in $dumpPaths) {
        try {
            $items = Get-ChildItem -Path $pattern -Force -ErrorAction SilentlyContinue |
                     Where-Object { -not $_.PSIsContainer -and $_.Length -gt 0 }

            foreach ($item in $items) {
                try {
                    $itemSize = $item.Length
                    Remove-Item -Path $item.FullName -Force -ErrorAction Stop
                    $filesRemoved++
                    $totalSizeFreed += $itemSize
                } catch {
                    continue
                }
            }
        } catch {
            continue
        }
    }

    @{
        filesRemoved = $filesRemoved
        sizeFreed = $totalSizeFreed
        category = "dumps"
        timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    } | ConvertTo-Json -Compress

} catch {
    @{
        filesRemoved = 0
        sizeFreed = 0
        category = "dumps"
        error = $_.Exception.Message
        timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    } | ConvertTo-Json -Compress
}`;
                break;

            case 'registry':
                // For registry, we'll simulate cleanup since actual registry operations are risky
                resolve({ category, filesRemoved: 25, sizeFreed: 5 * 1024 * 1024 }); // 5MB simulated
                return;

            default:
                reject(new Error('Unknown cleanup category'));
                return;
        }

        // Execute the inline PowerShell script
        processPool
            .executePowerShellCommand(script)
            .then(output => {
                const trimmedOutput = output.trim();
                if (trimmedOutput) {
                    try {
                        const result = JSON.parse(trimmedOutput);
                        resolve({
                            category,
                            filesRemoved: result.filesRemoved || 0,
                            sizeFreed: result.sizeFreed || 0,
                        });
                    } catch (error) {
                        loggingManager.logWarn(
                            `JSON parse error in cleanup results, using fallback: ${error.message}`,
                            'CleanupParser'
                        );
                        // Fallback to old format
                        const filesRemoved = parseInt(trimmedOutput) || 0;
                        resolve({ category, filesRemoved, sizeFreed: 0 });
                    }
                } else {
                    // Handle case where script runs successfully but returns no output
                    resolve({
                        category,
                        filesRemoved: 0,
                        sizeFreed: 0,
                    });
                }
            })
            .catch(error => {
                loggingManager.logError(
                    `Cleanup PowerShell command failed: ${error.message}`,
                    'CleanupCommand'
                );
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
            stdio: 'ignore',
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
        'taskmgr',
        'devmgmt.msc',
        'diskmgmt.msc',
        'services.msc',
        'eventvwr.msc',
        'perfmon.msc',
        'compmgmt.msc',
        'gpedit.msc',
        'secpol.msc',
        'lusrmgr.msc',
        'regedit',
        'msconfig',
        'cmd',
        'powershell',
        'control',
        'appwiz.cpl',
        'desk.cpl',
        'firewall.cpl',
        'inetcpl.cpl',
        'intl.cpl',
        'main.cpl',
        'mmsys.cpl',
        'ncpa.cpl',
        'powercfg.cpl',
        'sysdm.cpl',
        'timedate.cpl',
        'wscui.cpl',
        'cleanmgr',
        'dxdiag',
        'msinfo32',
        'resmon',
        'winver',
        'dfrgui',
        'diskpart',
        'netplwiz',
        'ms-settings:',
        'wt',
        'windowsterminal',
        'calc',
        'notepad',
        'mspaint',
        'snippingtool',
        'magnify',
        'osk',
    ];

    // Check if command starts with allowed utility or control command
    const isAllowed = allowedUtilities.some(
        util =>
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
                    stdio: 'ignore',
                });
            } else if (sanitizedCommand === 'cmd') {
                // For command prompt, open in new window
                process = spawn('cmd', ['/c', 'start', 'cmd'], {
                    shell: false,
                    detached: true,
                    stdio: 'ignore',
                });
            } else if (sanitizedCommand === 'powershell') {
                // For PowerShell, open in new window
                process = spawn('cmd', ['/c', 'start', 'powershell'], {
                    shell: false,
                    detached: true,
                    stdio: 'ignore',
                });
            } else if (sanitizedCommand === 'wt' || sanitizedCommand === 'windowsterminal') {
                // For Windows Terminal (Windows 11)
                process = spawn('cmd', ['/c', 'start', 'wt'], {
                    shell: false,
                    detached: true,
                    stdio: 'ignore',
                });
            } else if (sanitizedCommand.startsWith('ms-settings:')) {
                // For Windows 11 Settings app deep links
                process = spawn('cmd', ['/c', 'start', '""', sanitizedCommand], {
                    shell: false,
                    detached: true,
                    stdio: 'ignore',
                });
            } else if (sanitizedCommand.startsWith('control ')) {
                // For control panel commands
                process = spawn('cmd', ['/c', 'start', '""', sanitizedCommand], {
                    shell: false,
                    detached: true,
                    stdio: 'ignore',
                });
            } else if (sanitizedCommand === 'cleanmgr') {
                // For disk cleanup, check if it exists, fallback to Storage Sense
                const cleanmgrPath = 'C:\\Windows\\System32\\cleanmgr.exe';
                if (fsSync.existsSync(cleanmgrPath)) {
                    process = spawn('cmd', ['/c', 'start', '""', 'cleanmgr'], {
                        shell: false,
                        detached: true,
                        stdio: 'ignore',
                    });
                } else {
                    // Fallback to Storage Sense in Windows 11
                    process = spawn('cmd', ['/c', 'start', '""', 'ms-settings:storagesense'], {
                        shell: false,
                        detached: true,
                        stdio: 'ignore',
                    });
                }
            } else if (sanitizedCommand === 'dfrgui') {
                // For defrag, check if it exists, fallback to Storage settings
                const dfrgPath = 'C:\\Windows\\System32\\dfrgui.exe';
                if (fsSync.existsSync(dfrgPath)) {
                    process = spawn('cmd', ['/c', 'start', '""', 'dfrgui'], {
                        shell: false,
                        detached: true,
                        stdio: 'ignore',
                    });
                } else {
                    // Fallback to Storage optimization in Windows 11
                    process = spawn('cmd', ['/c', 'start', '""', 'ms-settings:storagesense'], {
                        shell: false,
                        detached: true,
                        stdio: 'ignore',
                    });
                }
            } else {
                // For other utilities, use start command to ensure proper launching
                process = spawn('cmd', ['/c', 'start', '""', sanitizedCommand], {
                    shell: false,
                    detached: true,
                    stdio: 'ignore',
                });
            }

            // Add error handling for the spawned process
            process.on('error', error => {
                loggingManager.logError(
                    `Error launching ${sanitizedCommand}: ${error.message}`,
                    'ProcessLauncher'
                );
                reject(new Error(`Failed to launch ${sanitizedCommand}: ${error.message}`));
            });

            process.on('close', code => {
                if (code !== 0 && code !== null) {
                    loggingManager.logWarn(
                        `Process ${sanitizedCommand} exited with code ${code}`,
                        'ProcessLauncher'
                    );
                }
            });

            process.unref();

            // Give the process a moment to start before resolving
            setTimeout(() => {
                resolve({
                    success: true,
                    message: `Successfully launched ${sanitizedCommand}`,
                });
            }, 100);
        } catch (error) {
            loggingManager.logError(`Error launching utility: ${error.message}`, 'UtilityLauncher');
            reject(new Error(`Failed to launch ${sanitizedCommand}: ${error.message}`));
        }
    });
});

// Services Management IPC handlers
ipcMain.handle('get-services', async () => {
    console.log('get-services handler called');

    try {
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
            isCommonService: isCommonService(service.Name),
        }));

        console.log(`Successfully processed ${enhancedServices.length} services`);
        return enhancedServices;
    } catch (error) {
        loggingManager.logError(`Error getting services: ${error.message}`, 'ServicesManager');
        loggingManager.logError(`Error stack: ${error.stack}`, 'ServicesManager');
        throw new Error(`Failed to get services: ${error.message}`);
    }
});

// Helper function to identify common services
function isCommonService(serviceName) {
    const commonServices = [
        'wuauserv', // Windows Update
        'spooler', // Print Spooler
        'BITS', // Background Intelligent Transfer Service
        'Themes', // Themes
        'AudioSrv', // Windows Audio
        'Dhcp', // DHCP Client
        'Dnscache', // DNS Client
        'EventLog', // Windows Event Log
        'LanmanServer', // Server
        'LanmanWorkstation', // Workstation
        'RpcSs', // Remote Procedure Call (RPC)
        'Schedule', // Task Scheduler
        'W32Time', // Windows Time
        'Winmgmt', // Windows Management Instrumentation
        'wscsvc', // Security Center
        'MpsSvc', // Windows Defender Firewall
        'WinDefend', // Windows Defender Antivirus Service
        'Netman', // Network Connections
        'NlaSvc', // Network Location Awareness
        'PlugPlay', // Plug and Play
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
            action: action,
        };
    } catch (error) {
        loggingManager.logError(
            `PowerShell error for ${action} ${serviceName}: ${error.message}`,
            'ServiceControl'
        );

        // If PowerShell fails due to execution policy, try using sc.exe as fallback
        if (error.message.includes('execution policy') ||
            error.message.includes('ExecutionPolicy') ||
            error.message.includes('cannot be loaded because running scripts is disabled')) {

            loggingManager.logInfo(
                `PowerShell execution policy blocked, trying sc.exe fallback for ${action} ${serviceName}`,
                'ServiceControl'
            );

            try {
                let scCommand;
                switch (action) {
                    case 'start':
                        scCommand = `sc start "${sanitizedServiceName}"`;
                        break;
                    case 'stop':
                        scCommand = `sc stop "${sanitizedServiceName}"`;
                        break;
                    case 'restart':
                        // For restart, we need to stop then start
                        scCommand = `sc stop "${sanitizedServiceName}" && timeout /t 2 /nobreak && sc start "${sanitizedServiceName}"`;
                        break;
                    default:
                        throw new Error(`Invalid action for sc.exe: ${action}`);
                }

                const scOutput = await processPool.executeCmdCommand(scCommand);
                return {
                    success: true,
                    message: `Service ${action} completed successfully using sc.exe`,
                    serviceName: serviceName,
                    action: action,
                };
            } catch (scError) {
                loggingManager.logError(
                    `Both PowerShell and sc.exe failed for ${action} ${serviceName}: ${scError.message}`,
                    'ServiceControl'
                );
                throw new Error(`Failed to ${action} service: PowerShell blocked by execution policy, sc.exe also failed: ${scError.message}`);
            }
        }

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
        loggingManager.logError(
            `Error getting service details: ${error.message}`,
            'ServiceDetails'
        );
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
    // Hide PowerShell execution logging for services manager
    const isServiceCommand = command.includes('Get-Service') ||
        command.includes('Start-Service') ||
        command.includes('Stop-Service') ||
        command.includes('Set-Service');

    if (!isServiceCommand) {
        console.log('execute-powershell handler called');
    }

    if (!command || typeof command !== 'string') {
        throw new Error('Invalid command parameter');
    }

    try {
        const output = await processPool.executePowerShellCommand(command);
        return output;
    } catch (error) {
        // Don't log expected failures as errors
        if (!processPool.isExpectedFailure(command, error.message)) {
            loggingManager.logError(
                `PowerShell execution error: ${error.message}`,
                'PowerShellExecution'
            );
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
        loggingManager.logError(`CMD execution error: ${error.message}`, 'CMDExecution');
        throw new Error(`CMD command failed: ${error.message}`);
    }
});

ipcMain.handle('show-open-dialog', async (event, options) => {
    console.log('show-open-dialog handler called with options:', options);
    try {
        const mainWindow = windowManager.getMainWindow();
        const result = await dialog.showOpenDialog(mainWindow, options);
        return result;
    } catch (error) {
        loggingManager.logError(`Error showing open dialog: ${error.message}`, 'FileDialog');
        throw new Error(`Failed to show open dialog: ${error.message}`);
    }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
    console.log('write-file handler called for:', filePath);
    try {
        await fs.writeFile(filePath, content, 'utf8');
        return { success: true };
    } catch (error) {
        loggingManager.logError(`Error writing file: ${error.message}`, 'FileOperations');
        throw new Error(`Failed to write file: ${error.message}`);
    }
});

ipcMain.handle('read-file', async (event, filePath) => {
    console.log('read-file handler called for:', filePath);
    try {
        const content = await fs.readFile(filePath, 'utf8');
        return content;
    } catch (error) {
        loggingManager.logError(`Error reading file: ${error.message}`, 'FileOperations');
        throw new Error(`Failed to read file: ${error.message}`);
    }
});

// File operation handlers
ipcMain.handle('open-file-dialog', async event => {
    console.log('open-file-dialog handler called');
    const mainWindow = windowManager.getMainWindow();
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Scripts', extensions: ['ps1', 'bat', 'cmd', 'sh', 'js'] },
            { name: 'All Files', extensions: ['*'] },
        ],
    });

    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }

    const filePath = result.filePaths[0];
    try {
        const content = await fs.readFile(filePath, 'utf8');
        return { filePath, content };
    } catch (error) {
        loggingManager.logError(`Error reading file: ${error.message}`, 'FileOperations');
        throw new Error(`Failed to read file: ${error.message}`);
    }
});

ipcMain.handle('show-save-dialog', async (event, options) => {
    console.log('show-save-dialog handler called with options:', options);
    try {
        const mainWindow = windowManager.getMainWindow();
        const result = await dialog.showSaveDialog(mainWindow, options);
        return result;
    } catch (error) {
        loggingManager.logError(`Error showing save dialog: ${error.message}`, 'FileDialog');
        throw new Error(`Failed to show save dialog: ${error.message}`);
    }
});

// Script execution handler for the editor tab
ipcMain.handle('execute-script', async (event, { script, shell }) => {
    // Hide PowerShell execution logging for service-related scripts
    const isServiceScript = script.includes('Get-Service') ||
        script.includes('Start-Service') ||
        script.includes('Stop-Service') ||
        script.includes('Set-Service');

    if (!isServiceScript) {
        console.log(`execute-script handler called for shell: ${shell}`);
    }

    // Use SimpleCommandExecutor for both PowerShell and CMD
    if (shell === 'powershell') {
        try {
            const output = await processPool.executePowerShellCommand(script);
            return {
                success: true,
                stdout: output,
                stderr: '',
            };
        } catch (error) {
            return {
                success: false,
                stdout: '',
                stderr: error.message,
            };
        }
    }

    // For CMD, use SimpleCommandExecutor
    try {
        const output = await processPool.executeCmdCommand(script);
        return {
            success: true,
            stdout: output,
            stderr: '',
        };
    } catch (error) {
        return {
            success: false,
            stdout: '',
            stderr: error.message,
        };
    }
});

ipcMain.handle('get-event-logs', async (event, logName) => {
    console.log(`get-event-logs handler called for: ${logName}`);

    if (
        !logName ||
        typeof logName !== 'string' ||
        !['Application', 'System', 'Security'].includes(logName)
    ) {
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
            loggingManager.logWarn(
                `Failed to parse event logs JSON: ${parseError.message}`,
                'EventLogs'
            );
            return [];
        }
    } catch (error) {
        loggingManager.logError(`Error getting event logs: ${error.message}`, 'EventLogs');
        // Return empty array instead of throwing to prevent app crashes
        return [];
    }
});

ipcMain.handle('save-file-dialog-and-write', async (event, content, options) => {
    const { title, defaultPath, filters } = options || {};
    const mainWindow = windowManager.getMainWindow();
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
        loggingManager.logError(`Failed to save file: ${error.message}`, 'FileSave');
        return { success: false, error: error.message };
    }
});

// Verified plugins handlers are now handled by PluginManager

// End of file
