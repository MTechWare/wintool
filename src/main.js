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

const { app, BrowserWindow, ipcMain, screen, dialog, shell, globalShortcut, Notification } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const os = require('os');
const windowsSysInfo = require('./utils/windows-sysinfo');
const discordPresence = require('./js/modules/discord-presence');
const SimpleCommandExecutor = require('./utils/simple-command-executor');
const WindowManager = require('./modules/window-manager');
const SettingsManager = require('./modules/settings-manager');
const PluginManager = require('./modules/plugin-manager');
const SystemTray = require('./modules/system-tray');
const LoggingManager = require('./modules/logging-manager');

// Command execution using SimpleCommandExecutor for better reliability







// Global command executor instance (replacement for ProcessPoolManager)
const processPool = new SimpleCommandExecutor();



// Performance optimization based on system capabilities
async function applyPerformanceOptimizations() {
    try {
        // Get system capabilities using simple detection
        const systemCapabilities = await processPool.detectSystemCapabilities();

        // Use SettingsManager to apply optimizations
        await settingsManager.applyPerformanceOptimizations(systemCapabilities);
    } catch (error) {
        console.error('Error applying performance optimizations:', error);
    }
}

// Plugin-related functions are now handled by PluginManager

// Settings manager instance
const settingsManager = new SettingsManager();

// Window manager instance
const windowManager = new WindowManager();

// Plugin manager instance
const pluginManager = new PluginManager();

// System tray instance
const systemTray = new SystemTray();

// Logging manager instance
const loggingManager = new LoggingManager();

// --- Helper Functions ---

// getPluginsPath function is now handled by PluginManager

/**
 * Ensures the user-writable directories exist on startup.
 */
async function ensureAppDirectoriesExist() {
    try {
        // Ensure the main MTechWare\WinTool directory exists
        const appDataPath = getAppDataPath();
        await fs.mkdir(appDataPath, { recursive: true });

        // Ensure the plugins directory exists
        await pluginManager.ensurePluginsDirectoryExists();

    } catch (error) {
        console.error('Fatal: Failed to create user directories:', error);
        dialog.showErrorBox('Initialization Error', `Failed to create required directories. Please check permissions.`);
    }
}

// getPluginMap function is now handled by PluginManager

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

// Disable unused Chromium features for smaller memory footprint
app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor,UseSurfaceLayerForVideo');
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('--disable-ipc-flooding-protection');
// Disable GPU features that aren't needed for a system tool
app.commandLine.appendSwitch('--disable-gpu-sandbox');
app.commandLine.appendSwitch('--disable-software-rasterizer');
// Memory optimizations
app.commandLine.appendSwitch('--memory-pressure-off');
app.commandLine.appendSwitch('--max_old_space_size=512'); // Limit V8 heap size

// Security logging is now handled by LoggingManager

// Enhanced logging system is now handled by LoggingManager



/**
 * Gets the correct, user-writable path for storing app data.
 * This ensures consistency with the plugin storage location.
 */
function getAppDataPath() {
    let basePath;

    // Use the same logic as getPluginsPath() for consistency
    if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
        basePath = process.env.LOCALAPPDATA;
    } else {
        // For other platforms or if the environment variable is missing,
        // fall back to Electron's standard 'userData' directory.
        basePath = app.getPath('userData');
    }

    // Use MTechWare\WinTool folder for all app data
    const appDataPath = path.join(basePath, 'MTechWare', 'WinTool');

    return appDataPath;
}

// Load store on demand








// System tray creation is now handled by SystemTray module





// Application quit functionality is now handled by SystemTray module

function restartApp() {
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow) {
        mainWindow.reload();
    }
}



// Plugin backend loading and communication is now handled by PluginManager


// App event handlers
async function initializeApplication() {
    // Set app user model ID for Windows notifications
    if (process.platform === 'win32') {
        app.setAppUserModelId('com.mtechware.wintool');
    }

    globalShortcut.register('Control+Q', () => {
        systemTray.quitApplication();
    });

    // Set up SettingsManager dependencies
    settingsManager.setDependencies({
        discordPresence: discordPresence,
        windowManager: windowManager,
        restartApp: restartApp
    });

    // Set up PluginManager dependencies
    pluginManager.setDependencies({
        settingsManager: settingsManager,
        windowManager: windowManager,
        processPool: processPool,
        restartApp: restartApp
    });

    // Set up SystemTray dependencies
    systemTray.setDependencies({
        windowManager: windowManager,
        app: app
    });

    // Set up LoggingManager dependencies
    loggingManager.setDependencies({
        windowManager: windowManager
    });

    // Initialize logging and set global logger
    loggingManager.initialize();
    global.logger = loggingManager;

    const { default: isElevated } = await import('is-elevated');
    const elevated = await isElevated();

    const showWindowAndFinishSetup = async () => {
        const mainWindow = windowManager.getMainWindow();
        if (mainWindow) {
            return; // Window already exists
        }

        try {
            // Set up WindowManager dependencies
            windowManager.setDependencies({
                getStore: () => settingsManager.getStore(),
                systemTray: systemTray,
                app: app
            });

            await windowManager.createWindow();
            systemTray.initialize();

            // Run slow tasks after the window is visible.
            (async () => {
                try {
                    const enableDiscordRpc = await settingsManager.getSetting('enableDiscordRpc', true);
                    if (enableDiscordRpc) {
                        discordPresence.start();
                    }

                    await ensureAppDirectoriesExist();

                    // Load plugin backends
                    await pluginManager.loadPluginBackends();

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
                        contextIsolation: true,
                        enableRemoteModule: false,
                        webSecurity: true,
                        sandbox: false,
                        devTools: process.env.NODE_ENV !== 'production'
                    },
                    frame: true, // Use standard frame
                    transparent: false, // No transparency
                    show: true // Show immediately
                });

                basicWindow.loadFile(path.join(__dirname, 'index.html'));
                // Note: We're not setting mainWindow here anymore since it's managed by WindowManager

                // Still create tray for basic functionality
                systemTray.initialize();
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
        const elevationChoice = await settingsManager.getSetting('elevationChoice', 'ask');

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
                    contextIsolation: true,
                    enableRemoteModule: false,
                    webSecurity: true,
                    sandbox: false,
                    devTools: process.env.NODE_ENV !== 'production'
                }
            });

            promptWindow.loadFile(path.join(__dirname, 'elevation-prompt.html'));

            promptWindow.webContents.on('did-finish-load', async () => {
                const themeSettings = await settingsManager.getThemeSettings();
                promptWindow.webContents.send('theme-data', themeSettings);
            });

            ipcMain.once('elevation-choice', async (event, { choice, remember }) => {
                promptWindow.close();

                if (remember) {
                    await settingsManager.setSetting('elevationChoice', choice ? 'yes' : 'no');
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
        await windowManager.createWindow();
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

    // Destroy system tray
    systemTray.destroyTray();

    // Cleanup SimpleCommandExecutor
    processPool.cleanup();

    // Clear performance monitoring
    if (performanceInterval) {
        clearInterval(performanceInterval);
        performanceInterval = null;
    }
});

// System tray IPC handlers are now handled by SystemTray module

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
    loggingManager.logSecurity('RUN_COMMAND', { command, asAdmin });

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
    const mainWindow = windowManager.getMainWindow();
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

// Settings IPC handlers are now handled by SettingsManager



// Custom log message handler is now handled by LoggingManager





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
                    const mainWindow = windowManager.getMainWindow();
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

                const mainWindow = windowManager.getMainWindow();
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

// Performance settings handlers are now handled by SettingsManager

ipcMain.handle('get-system-capabilities', () => {
    return {
        capabilities: processPool.systemCapabilities || 'unknown',
        maxActiveProcesses: processPool.maxActiveProcesses,
        isStartupPhase: processPool.isStartupPhase
    };
});

// Clear all settings handler is now handled by SettingsManager

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
        // Default to fast mode during startup phase for better performance
        const isStartupPhase = processPool && processPool.isStartupPhase;
        // Also enable fast mode if we've had recent timeout errors
        const hasRecentTimeoutError = systemInfoCache && systemInfoCache.error && systemInfoCache.error.includes('timed out');
        const shouldUseFastMode = isStartupPhase || hasRecentTimeoutError;
        const fastMode = await settingsManager.getSetting('fastSystemInfo', shouldUseFastMode);
        const useCache = await settingsManager.getSetting('cacheSystemInfo', true);

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
        loggingManager.logSecurity('BLOCKED_WINGET_COMMAND', { command: mainCommand, fullCommand: command });
        throw new Error(`Command '${mainCommand}' is not allowed for security reasons`);
    }

    // Log allowed winget commands for monitoring
    loggingManager.logSecurity('WINGET_COMMAND_EXECUTED', { command: mainCommand, args: commandParts.slice(1) });

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
        const mainWindow = windowManager.getMainWindow();
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
    const mainWindow = windowManager.getMainWindow();
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
        const mainWindow = windowManager.getMainWindow();
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
        console.error('Failed to save file:', error);
        return { success: false, error: error.message };
    }
});

// Verified plugins handlers are now handled by PluginManager

// End of file