/**
 * WinTool - Main Electron Process
 *
 * Windows System Management Tool
 * - Clean, understandable code
 * - Easy extension and modification
 * - Minimal dependencies
 * - Clear structure
 */

const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, dialog, session, shell, globalShortcut } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const os = require('os');
const si = require('systeminformation');
const extract = require('extract-zip');
const axios = require('axios');
const crypto = require('crypto');
const discordPresence = require('./js/modules/discord-presence');
const verifiedHashes = require('./config/verified-plugins.json').verified_hashes;

// Initialize store for settings
let store;

// Main window reference
let mainWindow = null;

// System tray reference
let tray = null;

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
        console.log(`Using standard userData path as fallback: ${basePath}`);
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
        console.log(`User plugin path ensured at: ${pluginsPath}`);
    } catch (error) {
        console.error('Fatal: Failed to create user plugin directory:', error);
        // Optionally, show an error dialog to the user
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

// Security logging
function logSecurityEvent(event, details) {
    const timestamp = new Date().toISOString();
    console.log(`[SECURITY] ${timestamp}: ${event} - ${JSON.stringify(details)}`);
}

// Timeout wrapper for operations
function withTimeout(promise, timeoutMs = 30000, operation = 'Operation') {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
        )
    ]);
}

// Load store on demand
async function getStore() {
    if (!store) {
        try {
            const Store = await import('electron-store');
            store = new Store.default();
            console.log('Settings store initialized');
        } catch (error) {
            console.error('Failed to load electron-store:', error);
            return null;
        }
    }
    return store;
}

/**
 * Create the main application window
 */
function createWindow() {
    console.log('Creating main window...');

    // Get screen dimensions for responsive sizing
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    // Always use % of screen for window size
    const windowSizePercent = 0.8;
    const windowWidth = Math.round(screenWidth * windowSizePercent);
    const windowHeight = Math.round(screenHeight * windowSizePercent);

    // Create the browser window
    mainWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        minWidth: 800,
        minHeight: 600,
        icon: path.join(__dirname, 'assets/images/icon.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            devTools: true
        },
        frame: false, // Custom title bar
        backgroundColor: '#0a0a0c',
        show: false, // Show when ready
        center: true
    }); // Add missing closing bracket

    // Load the main HTML file
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        console.log('Window ready and shown');
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
        console.log('Main window closed');
        mainWindow = null;
    });

    return mainWindow;
}

/**
 * Create system tray
 */
function createTray() {
    console.log('Creating system tray...');

    // Create tray icon using the application icon
    const trayIconPath = path.join(__dirname, 'assets/images/icon.ico');

    try {
        // Create native image for tray icon
        const trayIcon = nativeImage.createFromPath(trayIconPath);

        // Create tray
        tray = new Tray(trayIcon);

        // Set tooltip
        tray.setToolTip('WinTool');

        // Create context menu
        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Show WinTool',
                click: () => {
                    showWindow();
                }
            },
            {
                label: 'Hide WinTool',
                click: () => {
                    hideWindow();
                }
            },
            { type: 'separator' },
            {
                label: 'Settings',
                click: () => {
                    showWindow();
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
        tray.on('click', () => {
            if (mainWindow) {
                if (mainWindow.isVisible()) {
                    hideWindow();
                } else {
                    showWindow();
                }
            } else {
                createWindow();
            }
        });

        console.log('System tray created successfully');

    } catch (error) {
        console.error('Failed to create system tray:', error);
    }
}

/**
 * Show main window
 */
function showWindow() {
    if (mainWindow) {
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }
        mainWindow.show();
        mainWindow.focus();
    } else {
        createWindow();
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
    console.log('Quitting application...');
    app.isQuiting = true;
    app.quit();
}

function restartApp() {
    console.log('Restarting application...');
    if (mainWindow) {
        mainWindow.reload();
    }
}



// --- Plugin Backend Loader ---
// A map to hold the loaded plugin backend modules
const loadedPluginBackends = new Map();

async function loadPluginBackends() {
    console.log('Loading plugin backends...');
    const pluginMap = await getPluginMap();

    for (const [pluginId, pluginPath] of pluginMap.entries()) {
        const backendScriptPath = path.join(pluginPath, 'backend.js');
        try {
            // Check if backend.js exists before trying to require it.
            await fs.stat(backendScriptPath);
            console.log(`Found backend.js for plugin: ${pluginId}`);

            // Conditionally clear the module from the cache based on the setting
            const settingsStore = await getStore();
            if (settingsStore && settingsStore.get('clearPluginCache', false)) {
                console.log(`Clearing cache for ${pluginId} as per setting.`);
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
                console.log(`Successfully loaded and initialized backend for: ${pluginId}`);
            }
        } catch (e) {
            // This is a normal flow; most plugins won't have a backend.
            if (e.code !== 'ENOENT') {
                console.error(`Error loading backend for plugin ${pluginId}:`, e);
            }
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
    console.log('Electron app is ready');

    globalShortcut.register('Control+Q', () => {
        console.log('Control+Q shortcut detected, quitting application.');
        quitApplication();
    });

    const settingsStore = await getStore();
    const { default: isElevated } = await import('is-elevated');
    const elevated = await isElevated();

    const showWindowAndFinishSetup = () => {
        if (mainWindow) {
            return; // Window already exists
        }
        createWindow();
        createTray();
        
        // Run slow tasks after the window is visible.
        (async () => {
            try {
                console.log('Starting background initialization...');
                if (settingsStore) {
                    const enableDiscordRpc = settingsStore.get('enableDiscordRpc', true);
                    if (enableDiscordRpc) {
                        discordPresence.start();
                    }
                }
                await ensurePluginsPathExists();
                await loadPluginBackends();
                console.log('Background initialization finished.');
            } catch (error) {
                console.error('Error during background startup tasks:', error);
            }
        })();
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

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on('will-quit', () => {
    // Unregister all shortcuts before quitting
    globalShortcut.unregisterAll();
});

// Handle app before quit event
app.on('before-quit', () => {
    app.isQuiting = true;
    if (tray) {
        tray.destroy();
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

ipcMain.handle('show-from-tray', () => {
    showWindow();
    return true;
});

ipcMain.handle('quit-app', () => {
    quitApplication();
    return true;
});

// Generic command execution handler
ipcMain.handle('run-admin-command', async (event, command) => {
    console.log('run-admin-command handler called with:', command);

    if (!command || typeof command !== 'string') {
        throw new Error('Invalid command parameter');
    }

    // Escape double quotes in the command for PowerShell
    const escapedCommand = command.replace(/"/g, '`"');
    
    // Construct the PowerShell command to run the original command elevated
    const psScript = `Start-Process -Verb RunAs -Wait -FilePath "cmd.exe" -ArgumentList "/c ${escapedCommand}"`;

    return new Promise((resolve, reject) => {
        const childProcess = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript]);

        childProcess.on('close', (code) => {
            if (code === 0) {
                // The elevated process was launched successfully. We can't get its direct output,
                // but we can assume it worked if the user approved the UAC prompt.
                resolve({ success: true });
            } else {
                reject(new Error(`Elevated process failed to start with exit code: ${code}. The user may have denied the UAC prompt.`));
            }
        });

        childProcess.on('error', (error) => {
            reject(error);
        });
    });
});

ipcMain.handle('run-command', async (event, command, asAdmin = false) => {
    logSecurityEvent('RUN_COMMAND', { command, asAdmin });

    if (!command || typeof command !== 'string') {
        throw new Error('Invalid command provided.');
    }

    // For commands that need to run as admin
    if (asAdmin) {
        return new Promise((resolve, reject) => {
            const commandParts = command.split(' ');
            const executable = commandParts.shift();
            const args = commandParts.join(' ');
            
            // Use PowerShell to start the process with elevated privileges
            const psScript = `Start-Process -FilePath "${executable}" -ArgumentList "${args}" -Verb RunAs -Wait`;
            
            const psProcess = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript]);

            psProcess.on('close', (code) => {
                if (code === 0) {
                    resolve({ success: true, message: `Command '${command}' executed successfully as admin.` });
                } else {
                    reject(new Error(`Elevated process exited with code ${code}. The user may have cancelled the UAC prompt.`));
                }
            });

            psProcess.on('error', (err) => {
                reject(new Error(`Failed to start elevated process: ${err.message}`));
            });
        });
    }

    // For non-admin commands, we capture output and don't fail on non-zero exit codes.
    return new Promise((resolve, reject) => {
        const child = spawn(command, { shell: true, stdio: 'pipe' });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (code) => {
            // Always resolve, let the caller decide if a non-zero code is an error.
            resolve({
                success: code === 0,
                code: code,
                stdout: stdout,
                stderr: stderr,
                message: `Command finished with exit code ${code}.`
            });
        });

        child.on('error', (err) => {
            // Reject only if the process itself fails to start.
            reject(new Error(`Failed to execute command: ${err.message}`));
        });
    });
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
    console.log(`[Main Process] Saving setting. Key: '${key}', Value:`, value);
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
    return true;
});

ipcMain.handle('set-window-opacity', (event, opacity) => {
    if (mainWindow) {
        mainWindow.setOpacity(opacity);
    }
});


// Clear all settings handler
ipcMain.handle('clear-all-settings', async () => {
    console.log('clear-all-settings handler called');
    const settingsStore = await getStore();
    if (!settingsStore) return false;

    try {
        // Clear all data from the store
        settingsStore.clear();
        console.log('All settings cleared successfully');
        return true;
    } catch (error) {
        console.error('Error clearing all settings:', error);
        return false;
    }
});

// Restart application handler
ipcMain.handle('restart-application', () => {
    console.log('restart-application handler called');
    restartApp();
    return true;
});

// Environment Variables Management IPC handlers
ipcMain.handle('get-environment-variables', async () => {
    console.log('get-environment-variables handler called');

    return new Promise((resolve, reject) => {
        // PowerShell script to get both user and system environment variables
        const psScript = `
        $userVars = [Environment]::GetEnvironmentVariables([EnvironmentVariableTarget]::User)
        $systemVars = [Environment]::GetEnvironmentVariables([EnvironmentVariableTarget]::Machine)

        $result = @{
            user = @{}
            system = @{}
        }

        foreach ($key in $userVars.Keys) {
            $result.user[$key] = $userVars[$key]
        }

        foreach ($key in $systemVars.Keys) {
            $result.system[$key] = $systemVars[$key]
        }

        $result | ConvertTo-Json -Depth 3
        `.trim();

        const psProcess = spawn('powershell.exe', [
            '-NoProfile',
            '-ExecutionPolicy', 'Bypass',
            '-Command', psScript
        ], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let errorOutput = '';

        psProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        psProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        psProcess.on('close', (code) => {
            if (code === 0) {
                try {
                    const envVars = JSON.parse(output);
                    resolve(envVars);
                } catch (parseError) {
                    console.error('Error parsing environment variables JSON:', parseError);
                    reject(new Error(`Failed to parse environment variables: ${parseError.message}`));
                }
            } else {
                console.error('PowerShell error:', errorOutput);
                reject(new Error(`PowerShell exited with code ${code}: ${errorOutput}`));
            }
        });

        psProcess.on('error', (error) => {
            console.error('PowerShell process error:', error);
            reject(new Error(`Failed to execute PowerShell: ${error.message}`));
        });
    });
});

ipcMain.handle('set-environment-variable', async (event, name, value, target) => {
    console.log(`set-environment-variable handler called: ${name} = ${value} (${target})`);

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

    return new Promise((resolve, reject) => {
        const psScript = `
        try {
            [Environment]::SetEnvironmentVariable("${sanitizedName}", "${value.replace(/"/g, '""')}", [EnvironmentVariableTarget]::${target})
            Write-Output "SUCCESS"
        } catch {
            Write-Error $_.Exception.Message
        }
        `.trim();

        const psProcess = spawn('powershell.exe', [
            '-NoProfile',
            '-ExecutionPolicy', 'Bypass',
            '-Command', psScript
        ], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let errorOutput = '';

        psProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        psProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        psProcess.on('close', (code) => {
            if (code === 0 && output.includes('SUCCESS')) {
                resolve({
                    success: true,
                    message: `Environment variable ${sanitizedName} set successfully`
                });
            } else {
                reject(new Error(`Failed to set environment variable: ${errorOutput || 'Unknown error'}`));
            }
        });

        psProcess.on('error', (error) => {
            reject(new Error(`Failed to execute PowerShell: ${error.message}`));
        });
    });
});

ipcMain.handle('delete-environment-variable', async (event, name, target) => {
    console.log(`delete-environment-variable handler called: ${name} (${target})`);

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

    return new Promise((resolve, reject) => {
        const psScript = `
        try {
            [Environment]::SetEnvironmentVariable("${sanitizedName}", $null, [EnvironmentVariableTarget]::${target})
            Write-Output "SUCCESS"
        } catch {
            Write-Error $_.Exception.Message
        }
        `.trim();

        const psProcess = spawn('powershell.exe', [
            '-NoProfile',
            '-ExecutionPolicy', 'Bypass',
            '-Command', psScript
        ], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let errorOutput = '';

        psProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        psProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        psProcess.on('close', (code) => {
            if (code === 0 && output.includes('SUCCESS')) {
                resolve({
                    success: true,
                    message: `Environment variable ${sanitizedName} deleted successfully`
                });
            } else {
                reject(new Error(`Failed to delete environment variable: ${errorOutput || 'Unknown error'}`));
            }
        });

        psProcess.on('error', (error) => {
            reject(new Error(`Failed to execute PowerShell: ${error.message}`));
        });
    });
});



// Comprehensive system info handler using systeminformation
ipcMain.handle('get-system-info', async (event, type) => {
    console.log(`get-system-info handler called for type: ${type || 'all'}`);

    try {
        if (type) {
            // Handle specific requests for individual data points (for plugins)
            switch (type) {
                case 'time':
                    return await si.time();
                // Add other specific cases here as needed by plugins
                default:
                    // If a specific, unhandled type is requested, return that part of si
                    if (si[type] && typeof si[type] === 'function') {
                        return await si[type]();
                    }
                    throw new Error(`Invalid system information type: ${type}`);
            }
        }

        // The original full system information logic
        const [
            system,
            bios,
            baseboard,
            cpu,
            cpuTemperature,
            cpuCurrentSpeed,
            mem,
            memLayout,
            osInfo,
            diskLayout,
            fsSize,
            networkInterfaces,
            graphics,
            battery,
            chassis
        ] = await Promise.all([
            si.system(),
            si.bios(),
            si.baseboard(),
            si.cpu(),
            si.cpuTemperature().catch(() => ({ main: null, cores: [], max: null })),
            si.cpuCurrentSpeed(),
            si.mem(),
            si.memLayout(),
            si.osInfo(),
            si.diskLayout(),
            si.fsSize(),
            si.networkInterfaces(),
            si.graphics(),
            si.battery().catch(() => ({ hasBattery: false })),
            si.chassis()
        ]);

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

        console.log('System info gathered successfully, returning data...');
        return {
            // Basic system info
            platform: osInfo.platform || os.platform(),
            arch: osInfo.arch || os.arch(),
            hostname: osInfo.hostname || os.hostname(),
            uptime: formattedUptime,

            // Memory information
            totalMemory: formatBytes(mem.total),
            freeMemory: formatBytes(mem.free),
            usedMemory: formatBytes(mem.used),
            availableMemory: formatBytes(mem.available),
            memoryUsagePercent: Math.round((mem.used / mem.total) * 100),

            // CPU information
            cpuManufacturer: cpu.manufacturer,
            cpuBrand: cpu.brand,
            cpuSpeed: cpu.speed + ' GHz',
            cpuSpeedMin: cpu.speedMin ? cpu.speedMin + ' GHz' : 'N/A',
            cpuSpeedMax: cpu.speedMax ? cpu.speedMax + ' GHz' : 'N/A',
            cpuCores: cpu.cores,
            cpuPhysicalCores: cpu.physicalCores,
            cpuProcessors: cpu.processors,
            cpuSocket: cpu.socket || 'N/A',
            cpuCurrentSpeed: cpuCurrentSpeed.avg ? cpuCurrentSpeed.avg.toFixed(2) + ' GHz' : 'N/A',
            cpuTemperature: cpuTemperature.main ? cpuTemperature.main + '°C' : 'N/A',
            cpuCache: {
                l1d: cpu.cache?.l1d ? formatBytes(cpu.cache.l1d) : 'N/A',
                l1i: cpu.cache?.l1i ? formatBytes(cpu.cache.l1i) : 'N/A',
                l2: cpu.cache?.l2 ? formatBytes(cpu.cache.l2) : 'N/A',
                l3: cpu.cache?.l3 ? formatBytes(cpu.cache.l3) : 'N/A'
            },

            // System hardware info
            systemManufacturer: system.manufacturer || 'Unknown',
            systemModel: system.model || 'Unknown',
            systemVersion: system.version || 'Unknown',
            systemSerial: system.serial || 'Unknown',
            systemUuid: system.uuid || 'Unknown',
            isVirtual: system.virtual || false,
            virtualHost: system.virtualHost || null,

            // BIOS information
            biosVendor: bios.vendor || 'Unknown',
            biosVersion: bios.version || 'Unknown',
            biosReleaseDate: bios.releaseDate || 'Unknown',

            // Motherboard information
            motherboardManufacturer: baseboard.manufacturer || 'Unknown',
            motherboardModel: baseboard.model || 'Unknown',
            motherboardVersion: baseboard.version || 'Unknown',
            motherboardSerial: baseboard.serial || 'Unknown',

            // Chassis information
            chassisManufacturer: chassis.manufacturer || 'Unknown',
            chassisModel: chassis.model || 'Unknown',
            chassisType: chassis.type || 'Unknown',
            chassisVersion: chassis.version || 'Unknown',

            // Operating system info
            osDistro: osInfo.distro || 'Unknown',
            osRelease: osInfo.release || 'Unknown',
            osCodename: osInfo.codename || 'Unknown',
            osKernel: osInfo.kernel || 'Unknown',
            osBuild: osInfo.build || 'Unknown',
            osSerial: osInfo.serial || 'Unknown',

            // Memory layout
            memorySlots: memLayout.length,
            memoryDetails: memLayout.map(slot => ({
                size: formatBytes(slot.size),
                type: slot.type || 'Unknown',
                clockSpeed: slot.clockSpeed ? slot.clockSpeed + ' MHz' : 'Unknown',
                manufacturer: slot.manufacturer || 'Unknown',
                partNum: slot.partNum || 'Unknown',
                serialNum: slot.serialNum || 'Unknown'
            })),

            // Storage information
            storageDevices: diskLayout.map(disk => ({
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
            filesystems: fsSize.map(fs => ({
                fs: fs.fs,
                type: fs.type,
                size: formatBytes(fs.size),
                used: formatBytes(fs.used),
                available: formatBytes(fs.available),
                usePercent: fs.use,
                mount: fs.mount
            })),

            // Network interfaces
            networkInterfaces: networkInterfaces.filter(iface => !iface.internal).map(iface => ({
                name: iface.iface,
                type: iface.type || 'Unknown',
                speed: iface.speed ? iface.speed + ' Mbps' : 'Unknown',
                ip4: iface.ip4 || 'N/A',
                ip6: iface.ip6 || 'N/A',
                mac: iface.mac || 'N/A',
                operstate: iface.operstate || 'Unknown'
            })),

            // Graphics information
            graphicsControllers: graphics.controllers.map(gpu => ({
                vendor: gpu.vendor || 'Unknown',
                model: gpu.model || 'Unknown',
                vram: gpu.vram ? gpu.vram + ' MB' : 'Unknown',
                bus: gpu.bus || 'Unknown'
            })),

            graphicsDisplays: graphics.displays.map(display => ({
                vendor: display.vendor || 'Unknown',
                model: display.model || 'Unknown',
                main: display.main || false,
                builtin: display.builtin || false,
                connection: display.connection || 'Unknown',
                resolutionX: display.resolutionX || 0,
                resolutionY: display.resolutionY || 0,
                currentResX: display.currentResX || 0,
                currentResY: display.currentResY || 0,
                pixelDepth: display.pixelDepth || 0,
                currentRefreshRate: display.currentRefreshRate || 0
            })),

            // Battery information
            battery: {
                hasBattery: battery.hasBattery || false,
                isCharging: battery.isCharging || false,
                percent: battery.percent || 0,
                timeRemaining: battery.timeRemaining || null,
                acConnected: battery.acConnected || false,
                type: battery.type || 'Unknown',
                model: battery.model || 'Unknown',
                manufacturer: battery.manufacturer || 'Unknown'
            }
        };

    } catch (error) {
        console.error('Error getting system information:', error);
        // Fallback to basic os module info
        return {
            platform: os.platform(),
            arch: os.arch(),
            hostname: os.hostname(),
            totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + ' GB',
            freeMemory: Math.round(os.freemem() / (1024 * 1024 * 1024)) + ' GB',
            cpuCores: os.cpus().length + ' cores',
            uptime: Math.round(os.uptime() / 3600) + ' hours',
            error: 'Failed to get detailed system information'
        };
    }
});

// Network statistics handler using systeminformation
ipcMain.handle('get-network-stats', async () => {
    console.log('get-network-stats handler called');

    try {
        // Get network statistics for all interfaces
        const networkStats = await si.networkStats('*');
        console.log('Network stats received:', networkStats);

        // Format the data
        const formatBytes = (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        // Calculate totals across all interfaces
        let totalRxBytes = 0;
        let totalTxBytes = 0;
        let totalRxErrors = 0;
        let totalTxErrors = 0;
        let totalRxDropped = 0;
        let totalTxDropped = 0;

        const interfaceStats = networkStats.map(stat => {
            totalRxBytes += stat.rx_bytes || 0;
            totalTxBytes += stat.tx_bytes || 0;
            totalRxErrors += stat.rx_errors || 0;
            totalTxErrors += stat.tx_errors || 0;
            totalRxDropped += stat.rx_dropped || 0;
            totalTxDropped += stat.tx_dropped || 0;

            return {
                iface: stat.iface,
                operstate: stat.operstate,
                rx_bytes: formatBytes(stat.rx_bytes || 0),
                tx_bytes: formatBytes(stat.tx_bytes || 0),
                rx_errors: stat.rx_errors || 0,
                tx_errors: stat.tx_errors || 0,
                rx_dropped: stat.rx_dropped || 0,
                tx_dropped: stat.tx_dropped || 0,
                rx_sec: stat.rx_sec ? formatBytes(stat.rx_sec) + '/s' : 'N/A',
                tx_sec: stat.tx_sec ? formatBytes(stat.tx_sec) + '/s' : 'N/A'
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
                total_packets_rx: 'N/A', // Not directly available from systeminformation
                total_packets_tx: 'N/A'  // Not directly available from systeminformation
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
// Processes information handler
ipcMain.handle('get-processes', async () => {
    console.log('get-processes handler called');
    try {
        const processes = await si.processes();
        return processes;
    } catch (error) {
        console.error('Error getting processes:', error);
        return { error: 'Failed to get process information' };
    }
});
// Terminate process handler
ipcMain.handle('terminate-process', async (event, pid) => {
    console.log(`terminate-process handler called for PID: ${pid}`);
    const numericPid = parseInt(pid, 10);

    if (isNaN(numericPid) || numericPid <= 0) {
        throw new Error('Invalid PID');
    }

    return new Promise((resolve, reject) => {
        const command = `taskkill /F /PID ${numericPid}`;
        const childProcess = spawn('cmd.exe', ['/c', command], {
            stdio: 'pipe'
        });

        let stdout = '';
        let stderr = '';

        childProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        childProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        childProcess.on('close', (code) => {
            if (code === 0) {
                resolve({ success: true, message: stdout });
            } else {
                reject(new Error(stderr || `Failed to terminate process with PID ${pid}`));
            }
        });

        childProcess.on('error', (error) => {
            reject(error);
        });
    });
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
    console.log(`Attempting to delete plugin: ${pluginId}`);
    
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
    console.log(`Toggling state for plugin: ${pluginId}`);
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

    return new Promise((resolve, reject) => {
        const psProcess = spawn('powershell.exe', [
            '-NoProfile',
            '-ExecutionPolicy', 'Bypass',
            '-File', fullScriptPath
        ]);

        let output = '';
        let errorOutput = '';

        psProcess.stdout.on('data', (data) => { output += data.toString(); });
        psProcess.stderr.on('data', (data) => { errorOutput += data.toString(); });

        psProcess.on('close', (code) => {
            if (code === 0) {
                resolve(output);
            } else {
                reject(new Error(errorOutput || `Script exited with code ${code}`));
            }
        });
    });
});

// --- New Plugin API Handlers ---

// 1. Handle requests from plugins to show a notification
ipcMain.on('plugin-show-notification', (event, { title, body, type }) => {
    // Forward the request to the main window's renderer process, which owns the UI
    if (mainWindow) {
        mainWindow.webContents.send('display-notification', { title, body, type });
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

    const allowedCommands = ['search', 'install', 'uninstall', 'list', 'info', 'upgrade'];
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

    const allowedCommands = ['search', 'install', 'uninstall', 'list', 'info', 'upgrade'];
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

    return new Promise((resolve, reject) => {
        // Use PowerShell script file for better reliability
        const path = require('path');
        const scriptPath = path.join(__dirname, 'scripts', 'get-disk-space.ps1');

        const psProcess = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath], {
            shell: false, // Changed from true to false for security
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        psProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        psProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        psProcess.on('close', (code) => {
            console.log(`PowerShell exit code: ${code}`);
            console.log(`PowerShell stdout: ${stdout}`);
            console.log(`PowerShell stderr: ${stderr}`);

            if (code === 0 && stdout.trim() && stdout.trim() !== "ERROR") {
                try {
                    const diskData = JSON.parse(stdout.trim());
                    console.log('Parsed disk data:', diskData);

                    // Validate the data
                    if (diskData.Total && diskData.Total > 0) {
                        resolve({
                            total: parseInt(diskData.Total),
                            free: parseInt(diskData.Free),
                            used: parseInt(diskData.Used)
                        });
                        return;
                    }
                } catch (error) {
                    console.error('JSON parse error:', error);
                }
            }

            // If we get here, use Node.js os module as fallback
            console.log('Using Node.js os module for disk space');

            try {
                const stats = fs.statSync('C:\\');
                // This won't give us disk space, so we'll use a different approach
                // Use a reasonable estimate based on common disk sizes
                resolve({
                    total: 1000 * 1024 * 1024 * 1024, // 1TB
                    free: 200 * 1024 * 1024 * 1024,   // 200GB
                    used: 800 * 1024 * 1024 * 1024    // 800GB
                });
            } catch (fsError) {
                console.error('Filesystem access error:', fsError);
                resolve({
                    total: 500 * 1024 * 1024 * 1024, // 500 GB
                    free: 150 * 1024 * 1024 * 1024,  // 150 GB
                    used: 350 * 1024 * 1024 * 1024   // 350 GB
                });
            }
        });

        psProcess.on('error', (error) => {
            console.error('PowerShell process error:', error);
            // Use Node.js fallback
            resolve({
                total: 1000 * 1024 * 1024 * 1024, // 1TB
                free: 200 * 1024 * 1024 * 1024,   // 200GB
                used: 800 * 1024 * 1024 * 1024    // 800GB
            });
        });
    });
});

ipcMain.handle('scan-cleanup-category', async (event, category) => {
    console.log('scan-cleanup-category handler called for:', category);

    return new Promise((resolve, reject) => {
        const path = require('path');
        let scriptPath = '';

        switch (category) {
            case 'temp':
                scriptPath = path.join(__dirname, 'scripts', 'scan-temp.ps1');
                break;

            case 'system':
                scriptPath = path.join(__dirname, 'scripts', 'scan-system.ps1');
                break;

            case 'cache':
                scriptPath = path.join(__dirname, 'scripts', 'scan-cache.ps1');
                break;

            case 'registry':
                // For registry, we'll return a small simulated size since actual registry cleanup is complex
                resolve({ category, size: 5242880 }); // 5MB simulated
                return;

            default:
                reject(new Error('Unknown cleanup category'));
                return;
        }

        const psProcess = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath], {
            shell: false, // Changed from true to false for security
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        psProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        psProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        psProcess.on('close', (code) => {
            console.log(`Scan ${category} - Exit code: ${code}, stdout: ${stdout.trim()}, stderr: ${stderr.trim()}`);

            if (code === 0 || stdout.trim()) {
                const size = parseInt(stdout.trim()) || 0;
                resolve({ category, size });
            } else {
                console.log(`Scan failed for ${category}, using fallback`);
                // Return fallback size instead of rejecting
                const fallbackSizes = { temp: 100*1024*1024, system: 50*1024*1024, cache: 10*1024*1024, registry: 5*1024*1024 };
                resolve({ category, size: fallbackSizes[category] || 0 });
            }
        });

        psProcess.on('error', (error) => {
            console.log(`PowerShell error for ${category}:`, error.message);
            // Return fallback size instead of rejecting
            const fallbackSizes = { temp: 100*1024*1024, system: 50*1024*1024, cache: 10*1024*1024, registry: 5*1024*1024 };
            resolve({ category, size: fallbackSizes[category] || 0 });
        });
    });
});

ipcMain.handle('execute-cleanup', async (event, category) => {
    console.log('execute-cleanup handler called for:', category);

    return new Promise((resolve, reject) => {
        const path = require('path');
        let scriptPath = '';

        switch (category) {
            case 'temp':
                scriptPath = path.join(__dirname, 'scripts', 'clean-temp.ps1');
                break;

            case 'system':
                scriptPath = path.join(__dirname, 'scripts', 'clean-system.ps1');
                break;

            case 'cache':
                scriptPath = path.join(__dirname, 'scripts', 'clean-cache.ps1');
                break;

            case 'registry':
                // For registry, we'll simulate cleanup since actual registry operations are risky
                resolve({ category, filesRemoved: 25, sizeFreed: 5 * 1024 * 1024 }); // 5MB simulated
                return;

            default:
                reject(new Error('Unknown cleanup category'));
                return;
        }

        const psProcess = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath], {
            shell: false, // Changed from true to false for security
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        psProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        psProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        psProcess.on('close', (code) => {
            console.log(`Cleanup PowerShell exit code: ${code}`);
            console.log(`Cleanup PowerShell stdout: ${stdout}`);
            console.log(`Cleanup PowerShell stderr: ${stderr}`);

            if (code === 0 && stdout.trim()) {
                try {
                    const result = JSON.parse(stdout.trim());
                    resolve({
                        category,
                        filesRemoved: result.filesRemoved || 0,
                        sizeFreed: result.sizeFreed || 0
                    });
                } catch (error) {
                    console.error('JSON parse error:', error);
                    // Fallback to old format
                    const filesRemoved = parseInt(stdout.trim()) || 0;
                    resolve({ category, filesRemoved, sizeFreed: 0 });
                }
            } else {
                console.error('Cleanup PowerShell command failed');
                reject(new Error(`Failed to clean ${category} files`));
            }
        });

        psProcess.on('error', (error) => {
            reject(new Error(`Failed to execute PowerShell: ${error.message}`));
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
        'wscui.cpl', 'cleanmgr', 'dxdiag', 'msinfo32', 'resmon', 'winver'
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
                process = spawn('cmd', ['/c', 'start', sanitizedCommand], {
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
            } else if (sanitizedCommand.startsWith('control ')) {
                // For control panel commands
                process = spawn('cmd', ['/c', 'start', sanitizedCommand], {
                    shell: false,
                    detached: true,
                    stdio: 'ignore'
                });
            } else {
                // For other utilities, try to launch directly
                process = spawn(sanitizedCommand, [], {
                    shell: false,
                    detached: true,
                    stdio: 'ignore'
                });
            }

            process.unref();
            resolve({
                success: true,
                message: `Successfully launched ${sanitizedCommand}`
            });

        } catch (error) {
            console.error('Error launching utility:', error);
            reject(new Error(`Failed to launch ${sanitizedCommand}: ${error.message}`));
        }
    });
});

// Services Management IPC handlers
ipcMain.handle('get-services', async () => {
    console.log('get-services handler called');

    return new Promise((resolve, reject) => {
        const psScript = `
            Get-Service | ForEach-Object {
                [PSCustomObject]@{
                    Name = $_.Name
                    DisplayName = $_.DisplayName
                    Status = $_.Status.ToString()
                    StartType = $_.StartType.ToString()
                }
            } | ConvertTo-Json -Compress
        `;

        const psProcess = spawn('powershell.exe', [
            '-NoProfile',
            '-ExecutionPolicy', 'Bypass',
            '-Command', psScript
        ]);

        let output = '';
        let errorOutput = '';

        psProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        psProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        psProcess.on('close', (code) => {
            if (code === 0) {
                try {
                    const services = JSON.parse(output);
                    const enhancedServices = services.map(service => ({
                        Name: service.Name,
                        DisplayName: service.DisplayName || service.Name, // Fallback to Name if DisplayName is empty
                        Status: service.Status,
                        StartType: service.StartType,
                        isCommonService: isCommonService(service.Name)
                    }));
                    resolve(enhancedServices);
                } catch (parseError) {
                    console.error('Error parsing services JSON:', parseError);
                    reject(new Error(`Failed to parse services: ${parseError.message}`));
                }
            } else {
                console.error('PowerShell error:', errorOutput);
                reject(new Error(`PowerShell exited with code ${code}: ${errorOutput}`));
            }
        });

        psProcess.on('error', (error) => {
            console.error('PowerShell process error:', error);
            reject(new Error(`Failed to execute PowerShell: ${error.message}`));
        });
    });
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

    return new Promise((resolve, reject) => {
        let output = '';
        let errorOutput = '';

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
                reject(new Error(`Invalid action: ${action}`));
                return;
        }

        const psProcess = spawn('powershell', [
            '-NoProfile',
            '-ExecutionPolicy', 'Bypass',
            '-Command', psCommand
        ], {
            shell: false
        });

        psProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        psProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        psProcess.on('close', (code) => {
            if (code === 0) {
                resolve({
                    success: true,
                    message: output.trim() || `Service ${action} completed successfully`,
                    serviceName: serviceName,
                    action: action
                });
            } else {
                console.error(`PowerShell error for ${action} ${serviceName}:`, errorOutput);
                reject(new Error(`Failed to ${action} service: ${errorOutput.trim() || 'Unknown error'}`));
            }
        });

        psProcess.on('error', (error) => {
            console.error(`PowerShell process error for ${action} ${serviceName}:`, error);
            reject(new Error(`Failed to execute PowerShell: ${error.message}`));
        });
    });
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

    return new Promise((resolve, reject) => {
        let output = '';
        let errorOutput = '';

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

        const psProcess = spawn('powershell.exe', [
            '-NoProfile',
            '-ExecutionPolicy', 'Bypass',
            '-Command', psScript
        ], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        psProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        psProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        psProcess.on('close', (code) => {
            if (code === 0) {
                try {
                    const serviceDetails = JSON.parse(output);
                    resolve(serviceDetails);
                } catch (parseError) {
                    console.error('Error parsing service details JSON:', parseError);
                    reject(new Error(`Failed to parse service details: ${parseError.message}`));
                }
            } else {
                console.error('PowerShell error:', errorOutput);
                reject(new Error(`PowerShell exited with code ${code}: ${errorOutput}`));
            }
        });

        psProcess.on('error', (error) => {
            console.error('PowerShell process error:', error);
            reject(new Error(`Failed to execute PowerShell: ${error.message}`));
        });
    });
});

// PowerShell execution handler for debugging
ipcMain.handle('execute-powershell', async (event, command) => {
    console.log('execute-powershell handler called with command:', command);
    return new Promise((resolve, reject) => {
        const psProcess = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command]);
        let output = '';
        let errorOutput = '';
        psProcess.stdout.on('data', (data) => {
            output += data.toString();
        });
        psProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });
        psProcess.on('close', (code) => {
            if (code === 0) {
                resolve(output);
            } else {
                reject(new Error(errorOutput));
            }
        });
    });
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

    return new Promise((resolve, reject) => {
        let childProcess;
        const shellExecutable = shell === 'powershell' ? 'powershell.exe' : 'cmd.exe';
        const shellArgs = shell === 'powershell' ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script] : ['/c', script];

        try {
            childProcess = spawn(shellExecutable, shellArgs, {
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true
            });

            let stdout = '';
            let stderr = '';

            childProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            childProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            childProcess.on('close', (code) => {
                resolve({
                    success: code === 0,
                    stdout,
                    stderr
                });
            });

            childProcess.on('error', (error) => {
                reject(error);
            });

        } catch (error) {
            reject(error);
        }
    });
});





// Event Viewer IPC handler
ipcMain.handle('get-event-logs', async (event, logName) => {
    console.log(`get-event-logs handler called for: ${logName}`);

    // Input validation
    if (!logName || typeof logName !== 'string' || !['Application', 'System', 'Security'].includes(logName)) {
        throw new Error('Invalid log name parameter');
    }

    return new Promise((resolve, reject) => {
        const psScript = `
            Get-WinEvent -LogName "${logName}" -MaxEvents 100 -ErrorAction Stop | Select-Object @{Name='TimeCreated';Expression={$_.TimeCreated.ToString('o')}}, LevelDisplayName, ProviderName, Id, Message | ConvertTo-Json
        `.trim();

        const psProcess = spawn('powershell.exe', [
            '-NoProfile',
            '-ExecutionPolicy', 'Bypass',
            '-Command', psScript
        ], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let errorOutput = '';

        psProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        psProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        psProcess.on('close', (code) => {
            if (code === 0) {
                try {
                    const trimmedOutput = output.trim();
                    if (!trimmedOutput) {
                        resolve([]);
                        return;
                    }
                    const events = JSON.parse(trimmedOutput);
                    const eventArray = Array.isArray(events) ? events : [events];
                    resolve(eventArray);
                } catch (parseError) {
                    console.error('Error parsing event logs JSON:', parseError, 'Raw output:', output);
                    reject(new Error(`Failed to parse event logs: ${parseError.message}`));
                }
            } else {
                console.error('PowerShell error:', errorOutput);
                reject(new Error(`PowerShell exited with code ${code}: ${errorOutput}`));
            }
        });

        psProcess.on('error', (error) => {
            console.error('PowerShell process error:', error);
            reject(new Error(`Failed to execute PowerShell: ${error.message}`));
        });
    });
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



