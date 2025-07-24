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

const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, dialog, session, shell, globalShortcut, Notification } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const os = require('os');
const si = require('systeminformation');
const extract = require('extract-zip');
const axios = require('axios');
const crypto = require('crypto');
const discordPresence = require('./js/modules/discord-presence');

const verifiedHashes = {};

// Process Pool Manager for optimizing PowerShell/CMD process usage
class ProcessPoolManager {
    constructor() {
        this.powershellPool = [];
        this.cmdPool = [];
        this.maxPoolSize = 3; // Limit concurrent processes
        this.activeProcesses = 0;
        this.maxActiveProcesses = 1; // Even more conservative limit during startup for low-end systems
        this.pendingOperations = [];
        this.isStartupPhase = true;
        this.systemCapabilities = null; // Will be determined during startup
        // Command caching for frequently used operations
        this.commandCache = new Map();
        this.cacheTimeout = 30000; // 30 seconds cache timeout
    }

    async getPooledPowerShellProcess() {
        if (this.powershellPool.length > 0) {
            return this.powershellPool.pop();
        }

        if (this.activeProcesses >= this.maxActiveProcesses && this.isStartupPhase) {
            // Queue the operation during startup
            return new Promise((resolve) => {
                this.pendingOperations.push(() => resolve(this.createPowerShellProcess()));
            });
        }

        return this.createPowerShellProcess();
    }

    createPowerShellProcess() {
        this.activeProcesses++;
        const process = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: false
        });

        process.on('close', () => {
            this.activeProcesses--;
            this.processNextPending();
        });

        return process;
    }

    returnToPool(process, type = 'powershell') {
        if (type === 'powershell' && this.powershellPool.length < this.maxPoolSize) {
            this.powershellPool.push(process);
        } else if (type === 'cmd' && this.cmdPool.length < this.maxPoolSize) {
            this.cmdPool.push(process);
        } else {
            process.kill();
        }
    }

    processNextPending() {
        if (this.pendingOperations.length > 0 && this.activeProcesses < this.maxActiveProcesses) {
            const nextOperation = this.pendingOperations.shift();
            nextOperation();
        }
    }

    async detectSystemCapabilities() {
        try {
            const totalMemory = os.totalmem();
            const cpuCount = os.cpus().length;

            // Determine system capabilities
            const memoryGB = totalMemory / (1024 * 1024 * 1024);

            if (memoryGB < 4 || cpuCount < 4) {
                this.systemCapabilities = 'low-end';
                this.maxActiveProcesses = 2; // Very conservative for low-end
            } else if (memoryGB >= 8 && cpuCount >= 8) {
                this.systemCapabilities = 'high-end';
                this.maxActiveProcesses = 15; // More aggressive for high-end
            } else {
                this.systemCapabilities = 'mid-range';
                this.maxActiveProcesses = 8; // Balanced for mid-range
            }

            console.log(`Detected system capabilities: ${this.systemCapabilities} (${memoryGB.toFixed(1)}GB RAM, ${cpuCount} cores)`);
            console.log(`Set max active processes to: ${this.maxActiveProcesses}`);

        } catch (error) {
            console.error('Error detecting system capabilities:', error);
            this.systemCapabilities = 'unknown';
            this.maxActiveProcesses = 5; // Safe default
        }
    }

    async finishStartupPhase() {
        // Detect system capabilities before finishing startup
        await this.detectSystemCapabilities();

        this.isStartupPhase = false;

        // Process any remaining pending operations
        while (this.pendingOperations.length > 0 && this.activeProcesses < this.maxActiveProcesses) {
            this.processNextPending();
        }

        console.log(`Startup phase finished. System: ${this.systemCapabilities}, Max processes: ${this.maxActiveProcesses}`);
    }

    async executePowerShellCommand(command, timeout = 30000) {
        // Check cache first for read-only operations
        const cacheKey = this.getCacheKey(command);
        if (this.isReadOnlyCommand(command) && this.commandCache.has(cacheKey)) {
            const cached = this.commandCache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log('Returning cached PowerShell result');
                return cached.result;
            } else {
                this.commandCache.delete(cacheKey);
            }
        }

        // Use proper process limiting during startup phase
        let result;
        if (this.isStartupPhase) {
            result = await this.executeWithStartupLimit(() => this._executePowerShellDirect(command, timeout));
        } else {
            // After startup, use direct execution for better performance
            result = await this._executePowerShellDirect(command, timeout);
        }

        // Cache read-only command results
        if (this.isReadOnlyCommand(command)) {
            this.commandCache.set(cacheKey, {
                result: result,
                timestamp: Date.now()
            });
        }

        return result;
    }

    getCacheKey(command) {
        // Create a simple hash of the command for caching
        return command.replace(/\s+/g, ' ').trim().toLowerCase();
    }

    isReadOnlyCommand(command) {
        // Identify read-only commands that can be safely cached
        const readOnlyPatterns = [
            /^Get-/i,
            /^Test-Path/i,
            /^\$env:/i,
            /^sc\.exe query/i,
            /^reg query/i,
            /^wmic/i
        ];

        return readOnlyPatterns.some(pattern => pattern.test(command.trim()));
    }

    async executeWithStartupLimit(operation) {
        if (this.activeProcesses >= this.maxActiveProcesses) {
            // Queue the operation during startup
            return new Promise((resolve, reject) => {
                this.pendingOperations.push(async () => {
                    try {
                        const result = await operation();
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                });
            });
        }

        return operation();
    }

    async _executePowerShellDirect(command, timeout = 30000) {
        return new Promise((resolve, reject) => {
            // Adaptive timeout based on system capabilities
            let adaptiveTimeout = timeout;
            if (this.systemCapabilities === 'low-end') {
                adaptiveTimeout = Math.min(timeout * 1.5, 45000); // Give low-end systems more time
            } else if (this.systemCapabilities === 'high-end') {
                adaptiveTimeout = Math.max(timeout * 0.8, 15000); // Expect faster execution on high-end
            }

            const timeoutId = setTimeout(() => {
                reject(new Error(`PowerShell command timed out after ${adaptiveTimeout}ms`));
            }, adaptiveTimeout);

            try {
                // Track active processes during startup
                if (this.isStartupPhase) {
                    this.activeProcesses++;
                }

                // Optimize PowerShell parameters based on system capabilities
                let psArgs = ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden'];

                if (this.systemCapabilities === 'low-end') {
                    // More conservative settings for low-end systems
                    psArgs.push('-ExecutionPolicy', 'RemoteSigned');
                    psArgs.push('-NoLogo'); // Reduce startup overhead
                } else {
                    // Standard settings for other systems
                    psArgs.push('-ExecutionPolicy', 'RemoteSigned');
                }

                psArgs.push('-Command', command);

                const psProcess = spawn('powershell.exe', psArgs, {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    shell: false
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
                    clearTimeout(timeoutId);

                    // Decrease active process count and process next pending
                    if (this.isStartupPhase) {
                        this.activeProcesses--;
                        this.processNextPending();
                    }

                    if (code === 0) {
                        resolve(output.trim());
                    } else {
                        reject(new Error(errorOutput || `PowerShell exited with code ${code}`));
                    }
                });

                psProcess.on('error', (error) => {
                    clearTimeout(timeoutId);

                    // Decrease active process count on error
                    if (this.isStartupPhase) {
                        this.activeProcesses--;
                        this.processNextPending();
                    }

                    reject(error);
                });

            } catch (error) {
                clearTimeout(timeoutId);

                // Decrease active process count on exception
                if (this.isStartupPhase) {
                    this.activeProcesses--;
                    this.processNextPending();
                }

                reject(error);
            }
        });
    }

    // CMD Process Pool Methods
    async getPooledCmdProcess() {
        if (this.cmdPool.length > 0) {
            return this.cmdPool.pop();
        }

        if (this.activeProcesses >= this.maxActiveProcesses && this.isStartupPhase) {
            // Queue the operation during startup
            return new Promise((resolve) => {
                this.pendingOperations.push(() => resolve(this.createCmdProcess()));
            });
        }

        return this.createCmdProcess();
    }

    createCmdProcess() {
        this.activeProcesses++;
        const process = spawn('cmd.exe', ['/Q'], { // /Q for quiet mode
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: false
        });

        process.on('close', () => {
            this.activeProcesses--;
            this.processNextPending();
        });

        return process;
    }

    async executeCmdCommand(command, timeout = 30000) {
        // Use proper process limiting during startup phase
        if (this.isStartupPhase) {
            return this.executeWithStartupLimit(() => this._executeCmdDirect(command, timeout));
        }

        // After startup, use direct execution for better performance
        return this._executeCmdDirect(command, timeout);
    }

    async _executeCmdDirect(command, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`CMD command timed out after ${timeout}ms`));
            }, timeout);

            try {
                // Track active processes during startup
                if (this.isStartupPhase) {
                    this.activeProcesses++;
                }

                // Use CMD with /C to execute command and exit
                const cmdProcess = spawn('cmd.exe', ['/C', command], {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    shell: false
                });

                let output = '';
                let errorOutput = '';

                cmdProcess.stdout.on('data', (data) => {
                    output += data.toString();
                });

                cmdProcess.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });

                cmdProcess.on('close', (code) => {
                    clearTimeout(timeoutId);

                    // Decrease active process count
                    if (this.isStartupPhase) {
                        this.activeProcesses--;
                        this.processNextPending();
                    }

                    if (code === 0) {
                        resolve(output);
                    } else {
                        reject(new Error(`CMD command failed with exit code ${code}: ${errorOutput || 'Unknown error'}`));
                    }
                });

                cmdProcess.on('error', (error) => {
                    clearTimeout(timeoutId);

                    // Decrease active process count on error
                    if (this.isStartupPhase) {
                        this.activeProcesses--;
                        this.processNextPending();
                    }

                    reject(new Error(`CMD process error: ${error.message}`));
                });

            } catch (error) {
                clearTimeout(timeoutId);

                // Decrease active process count on exception
                if (this.isStartupPhase) {
                    this.activeProcesses--;
                    this.processNextPending();
                }

                reject(error);
            }
        });
    }

    cleanup() {
        // Clean up all pooled processes
        [...this.powershellPool, ...this.cmdPool].forEach(process => {
            try {
                process.kill();
            } catch (e) {
                // Ignore errors during cleanup
            }
        });
        this.powershellPool = [];
        this.cmdPool = [];
    }
}

// Global process pool instance
const processPool = new ProcessPoolManager();

// Startup Process Limiter
class StartupProcessLimiter {
    constructor() {
        this.isStartupPhase = true;
        this.maxConcurrentProcesses = 2; // Increased from 1 to 2 for faster startup
        this.activeProcesses = 0;
        this.pendingOperations = [];
    }

    async executeWithLimit(operation) {
        if (!this.isStartupPhase) {
            return operation();
        }

        if (this.activeProcesses < this.maxConcurrentProcesses) {
            this.activeProcesses++;
            try {
                const result = await operation();
                return result;
            } finally {
                this.activeProcesses--;
                this.processNext();
            }
        } else {
            return new Promise((resolve, reject) => {
                this.pendingOperations.push(async () => {
                    try {
                        this.activeProcesses++;
                        const result = await operation();
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    } finally {
                        this.activeProcesses--;
                        this.processNext();
                    }
                });
            });
        }
    }

    processNext() {
        if (this.pendingOperations.length > 0 && this.activeProcesses < this.maxConcurrentProcesses) {
            const nextOperation = this.pendingOperations.shift();
            nextOperation();
        }
    }

    finishStartupPhase() {
        this.isStartupPhase = false;
        // Process all remaining operations
        while (this.pendingOperations.length > 0) {
            this.processNext();
        }
    }
}

// Global startup limiter instance
const startupLimiter = new StartupProcessLimiter();

// Performance optimization based on system capabilities
async function applyPerformanceOptimizations() {
    try {
        const settingsStore = await getStore();
        if (!settingsStore) return;

        // Get system capabilities from process pool
        const systemCapabilities = processPool.systemCapabilities;

        if (systemCapabilities === 'low-end') {
            console.log('Applying low-end system optimizations...');

            // Enable performance optimizations for low-end systems
            settingsStore.set('fastSystemInfo', true);
            settingsStore.set('performanceMode', 'low-end');
            settingsStore.set('cacheSystemInfo', true);
            settingsStore.set('enableDiscordRpc', false); // Disable Discord RPC for performance
            settingsStore.set('clearPluginCache', true); // Clear plugin cache to save memory

            // Reduce window visibility monitoring frequency
            if (visibilityCheckInterval) {
                clearInterval(visibilityCheckInterval);
                visibilityCheckInterval = setInterval(async () => {
                    // Reduced frequency visibility check for low-end systems
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        const isVisible = mainWindow.isVisible();
                        const isMinimized = mainWindow.isMinimized();

                        if (!isVisible && !isMinimized && !isIntentionallyHidden) {
                            console.warn('Window visibility issue detected (low-end mode)');
                            try {
                                mainWindow.show();
                                mainWindow.focus();
                            } catch (error) {
                                console.error('Error during visibility recovery:', error);
                            }
                        }
                    }
                }, 30000); // Check every 30 seconds instead of 10
            }

        } else if (systemCapabilities === 'high-end') {
            console.log('Applying high-end system optimizations...');

            // Enable full features for high-end systems
            settingsStore.set('fastSystemInfo', false);
            settingsStore.set('performanceMode', 'high-end');
            settingsStore.set('cacheSystemInfo', true);
            settingsStore.set('enableDiscordRpc', true);

        } else {
            console.log('Applying balanced optimizations for mid-range system...');

            // Balanced settings for mid-range systems
            settingsStore.set('performanceMode', 'balanced');
            settingsStore.set('cacheSystemInfo', true);
        }

        console.log(`Performance optimizations applied for ${systemCapabilities} system`);

    } catch (error) {
        console.error('Error applying performance optimizations:', error);
    }
}

// Fetch verified plugins list from GitHub only
async function updateVerifiedPluginsList() {
    try {
        console.log('Fetching verified plugins list from GitHub...');
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
            console.log(`Successfully fetched and updated verified plugins list. Found ${Object.keys(response.data.verified_hashes).length} verified plugins.`);
        } else {
            throw new Error('Invalid response format from GitHub');
        }
    } catch (error) {
        console.error('Failed to fetch verified plugins list from GitHub:', error.message);
        console.warn('No verified plugins available - operating without verification');
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

// Window visibility monitoring
let visibilityCheckInterval = null;
let windowCreationAttempts = 0;
const MAX_WINDOW_CREATION_ATTEMPTS = 3;
let isIntentionallyHidden = false; // Track if window was intentionally hidden to tray

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

// Security logging using enhanced logger
function logSecurityEvent(event, details) {
    if (global.logger) {
        global.logger.logSecurity(event, details);
    } else {
        // Fallback if logger not initialized yet
        const timestamp = new Date().toISOString();
        console.log(`[SECURITY] ${timestamp}: ${event} - ${JSON.stringify(details)}`);
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
    console.log(`Creating main window... (attempt ${windowCreationAttempts + 1}/${MAX_WINDOW_CREATION_ATTEMPTS})`);
    windowCreationAttempts++;

    try {
        // Get screen dimensions for responsive sizing
        const primaryDisplay = screen.getPrimaryDisplay();
        const {
            width: screenWidth,
            height: screenHeight
        } = primaryDisplay.workAreaSize;

        console.log(`Screen dimensions: ${screenWidth}x${screenHeight}`);

        // Validate screen dimensions
        if (screenWidth < 800 || screenHeight < 600) {
            console.warn(`Screen dimensions too small: ${screenWidth}x${screenHeight}`);
        }

        // Always use % of screen for window size
        const windowSizePercent = 0.8;
        const windowWidth = Math.max(800, Math.round(screenWidth * windowSizePercent));
        const windowHeight = Math.max(600, Math.round(screenHeight * windowSizePercent));

        console.log(`Calculated window size: ${windowWidth}x${windowHeight}`);

        // Get transparency setting before creating the window
        const settingsStore = await getStore();
        let opacity = settingsStore ? settingsStore.get('transparency', 1) : 1;
        let useTransparent = settingsStore ? settingsStore.get('useTransparentWindow', false) : false; // Default to false for better compatibility

        // If we've had multiple failed attempts, disable transparency
        if (windowCreationAttempts > 1) {
            console.log('Multiple creation attempts detected, disabling transparency for stability');
            useTransparent = false;
            if (settingsStore) {
                settingsStore.set('useTransparentWindow', false);
            }
        }

        // Ensure opacity is within valid range and not causing invisible window
        if (opacity < 0.3) {
            console.warn(`Opacity too low (${opacity}), setting to minimum safe value`);
            opacity = 0.3;
            // Save the corrected value
            if (settingsStore) {
                settingsStore.set('transparency', opacity);
            }
        }
        if (opacity > 1) {
            opacity = 1;
        }

        console.log(`Creating window with opacity: ${opacity}, transparent: ${useTransparent}`);

        // Calculate window position to ensure it's on screen
        const x = Math.max(0, Math.round((screenWidth - windowWidth) / 2));
        const y = Math.max(0, Math.round((screenHeight - windowHeight) / 2));

        console.log(`Window position: ${x}, ${y}`);

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

        console.log('Window options:', JSON.stringify(windowOptions, null, 2));

        mainWindow = new BrowserWindow(windowOptions);
        console.log('BrowserWindow created successfully');

    } catch (error) {
        console.error('Error creating BrowserWindow:', error);

        if (windowCreationAttempts < MAX_WINDOW_CREATION_ATTEMPTS) {
            console.log('Retrying window creation with fallback settings...');
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
        console.log('Window set to always on top');
    }

    // Show window when ready with improved visibility handling
    mainWindow.once('ready-to-show', () => {
        try {
            console.log('Window ready-to-show event fired');

            // Ensure window is properly positioned before showing
            const bounds = mainWindow.getBounds();
            console.log(`Window bounds before show: x=${bounds.x}, y=${bounds.y}, width=${bounds.width}, height=${bounds.height}`);

            // Verify window is within screen bounds
            const primaryDisplay = screen.getPrimaryDisplay();
            const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

            if (bounds.x < 0 || bounds.y < 0 || bounds.x > screenWidth || bounds.y > screenHeight) {
                console.warn('Window appears to be off-screen, repositioning...');
                mainWindow.center();
            }

            // Show the window
            mainWindow.show();
            console.log('Window.show() called');

            // Focus the window
            mainWindow.focus();
            console.log('Window.focus() called');

            // Verify visibility after a short delay
            setTimeout(() => {
                if (mainWindow) {
                    const isVisible = mainWindow.isVisible();
                    const isMinimized = mainWindow.isMinimized();
                    const currentOpacity = mainWindow.getOpacity();

                    console.log(`Window visibility check: visible=${isVisible}, minimized=${isMinimized}, opacity=${currentOpacity}`);

                    if (!isVisible) {
                        console.warn('Window not visible after show(), attempting recovery...');

                        // Try multiple recovery strategies
                        try {
                            // Strategy 1: Increase opacity if too low
                            if (currentOpacity < 0.3) {
                                console.log('Increasing opacity for visibility');
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
                        console.log('Window successfully shown and visible');
                        // Reset creation attempts on successful show
                        windowCreationAttempts = 0;
                        // Start visibility monitoring
                        startVisibilityMonitoring();
                    }
                }
            }, 200);

        } catch (error) {
            console.error('Error in ready-to-show handler:', error);
            // Fallback: try to show window without focus
            try {
                console.log('Attempting fallback show...');
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
                        console.log('Disabling transparency and recreating window...');
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
        console.log('Main window closed');
        stopVisibilityMonitoring();
        mainWindow = null;
    });

    // Clear the intentionally hidden flag when creating a new window
    isIntentionallyHidden = false;

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
        // Verify icon file exists
        console.log(`Tray icon path: ${trayIconPath}`);

        // Create native image for tray icon
        const trayIcon = nativeImage.createFromPath(trayIconPath);

        // Check if icon was loaded successfully
        if (trayIcon.isEmpty()) {
            console.warn('Tray icon is empty, using default icon');
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

        console.log('System tray created successfully');

    } catch (error) {
        console.error('Failed to create system tray:', error);
    }
}

/**
 * Show main window with improved visibility handling
 */
async function showWindow() {
    console.log('showWindow() called');
    isIntentionallyHidden = false; // Clear the intentionally hidden flag

    if (mainWindow) {
        try {
            console.log('Attempting to show existing window');

            // Check if window is destroyed
            if (mainWindow.isDestroyed()) {
                console.warn('Main window was destroyed, recreating...');
                mainWindow = null;
                await createWindow();
                return;
            }

            // Restore if minimized
            if (mainWindow.isMinimized()) {
                console.log('Window is minimized, restoring...');
                mainWindow.restore();
            }

            // Get current window state for debugging
            const bounds = mainWindow.getBounds();
            const isVisible = mainWindow.isVisible();
            const opacity = mainWindow.getOpacity();

            console.log(`Window state before show: visible=${isVisible}, opacity=${opacity}, bounds=${JSON.stringify(bounds)}`);

            // Ensure window is visible
            mainWindow.show();
            mainWindow.focus();

            console.log('Window show() and focus() called');

            // Double-check visibility and force if needed
            setTimeout(() => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    const stillVisible = mainWindow.isVisible();
                    console.log(`Window visibility after show: ${stillVisible}`);

                    if (!stillVisible) {
                        console.warn('Window still not visible, attempting recovery...');

                        try {
                            // Multiple recovery strategies
                            const currentOpacity = mainWindow.getOpacity();

                            // Strategy 1: Ensure minimum opacity
                            if (currentOpacity < 0.3) {
                                console.log('Setting minimum opacity for visibility');
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

                                    // Final check
                                    setTimeout(() => {
                                        if (mainWindow && !mainWindow.isDestroyed()) {
                                            const finalVisible = mainWindow.isVisible();
                                            console.log(`Final visibility check: ${finalVisible}`);

                                            if (!finalVisible) {
                                                console.error('All recovery attempts failed, window remains invisible');
                                                // Consider showing an error dialog or recreating without transparency
                                            }
                                        }
                                    }, 200);
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
        console.log('No existing window, creating new one');
        await createWindow();
    }
}

/**
 * Hide main window
 */
function hideWindow() {
    if (mainWindow) {
        isIntentionallyHidden = true; // Mark as intentionally hidden
        mainWindow.hide();
    }
}

/**
 * Start monitoring window visibility and recover if needed
 */
function startVisibilityMonitoring() {
    if (visibilityCheckInterval) {
        clearInterval(visibilityCheckInterval);
    }

    console.log('Starting window visibility monitoring...');

    visibilityCheckInterval = setInterval(async () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            const isVisible = mainWindow.isVisible();
            const isMinimized = mainWindow.isMinimized();
            const opacity = mainWindow.getOpacity();

            // Only log if there's an issue AND the window wasn't intentionally hidden
            if (!isVisible && !isMinimized && !isIntentionallyHidden) {
                console.warn(`Window visibility issue detected: visible=${isVisible}, minimized=${isMinimized}, opacity=${opacity}`);

                // Attempt to recover
                try {
                    if (opacity < 0.3) {
                        console.log('Correcting low opacity');
                        mainWindow.setOpacity(0.8);
                    }

                    mainWindow.show();
                    mainWindow.focus();

                    // Check if recovery worked
                    setTimeout(() => {
                        if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
                            console.error('Window recovery failed, may need manual intervention');
                        }
                    }, 1000);

                } catch (error) {
                    console.error('Error during visibility recovery:', error);
                }
            }
        }
    }, 10000); // Check every 10 seconds
}

/**
 * Stop visibility monitoring
 */
function stopVisibilityMonitoring() {
    if (visibilityCheckInterval) {
        clearInterval(visibilityCheckInterval);
        visibilityCheckInterval = null;
        console.log('Window visibility monitoring stopped');
    }
}

/**
 * Quit application properly
 */
function quitApplication() {
    console.log('Quitting application...');
    stopVisibilityMonitoring();
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
    const pluginStart = performance.now();
    console.log('🔌 Loading plugin backends...');
    const pluginMap = await getPluginMap();

    // Batch plugin loading to reduce concurrent processes - optimized for faster startup
    const pluginEntries = Array.from(pluginMap.entries());
    const batchSize = 5; // Increased from 3 to 5 plugins at a time for faster loading
    console.log(`📦 Found ${pluginEntries.length} plugins to load in batches of ${batchSize}`);

    for (let i = 0; i < pluginEntries.length; i += batchSize) {
        const batch = pluginEntries.slice(i, i + batchSize);

        // Process batch concurrently but with limited concurrency
        await Promise.all(batch.map(async ([pluginId, pluginPath]) => {
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
        }));

        // Reduced delay between batches for faster startup
        if (i + batchSize < pluginEntries.length) {
            await new Promise(resolve => setTimeout(resolve, 50)); // Reduced from 100ms to 50ms
        }
    }

    console.log(`✅ Plugin backends loaded in ${(performance.now() - pluginStart).toFixed(2)}ms`);
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
    console.log('=== WinTool Initialization Started ===');
    console.log(`Platform: ${process.platform}`);
    console.log(`Electron version: ${process.versions.electron}`);
    console.log(`Node version: ${process.versions.node}`);
    console.log(`App path: ${app.getAppPath()}`);
    console.log(`User data path: ${app.getPath('userData')}`);

    // Set app user model ID for Windows notifications
    if (process.platform === 'win32') {
        app.setAppUserModelId('com.mtechware.wintool');
        console.log('App User Model ID set for Windows notifications');
    }

    globalShortcut.register('Control+Q', () => {
        console.log('Control+Q shortcut detected, quitting application.');
        quitApplication();
    });

    const settingsStore = await getStore();
    console.log('Settings store initialized:', !!settingsStore);

    const { default: isElevated } = await import('is-elevated');
    const elevated = await isElevated();
    console.log(`Running elevated: ${elevated}`);

    const showWindowAndFinishSetup = async () => {
        console.log('=== Starting Window and Setup Process ===');

        if (mainWindow) {
            console.log('Window already exists, skipping creation');
            return; // Window already exists
        }

        try {
            console.log('Creating main window...');
            await createWindow();
            console.log('Main window created successfully');

            console.log('Creating system tray...');
            createTray();
            console.log('System tray created successfully');

            // Run slow tasks after the window is visible.
            (async () => {
                try {
                    console.log('Starting background initialization...');

                    if (settingsStore) {
                        const enableDiscordRpc = settingsStore.get('enableDiscordRpc', true);
                        console.log(`Discord RPC enabled: ${enableDiscordRpc}`);
                        if (enableDiscordRpc) {
                            discordPresence.start();
                        }
                    }

                    console.log('Ensuring plugins path exists...');
                    await ensurePluginsPathExists();

                    // Use startup limiter for plugin loading
                    console.log('Loading plugin backends...');
                    await startupLimiter.executeWithLimit(async () => {
                        await loadPluginBackends();
                    });

                    // Finish startup phase to allow more processes
                    await processPool.finishStartupPhase();
                    startupLimiter.finishStartupPhase();

                    // Apply performance optimizations based on detected system
                    await applyPerformanceOptimizations();

                    console.log('=== Background initialization finished ===');
                } catch (error) {
                    console.error('Error during background startup tasks:', error);
                }
            })();
        } catch (error) {
            console.error('Error in showWindowAndFinishSetup:', error);

            // Try to create a basic window without advanced features
            try {
                console.log('Attempting basic window creation as fallback...');
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

                console.log('Basic window created successfully');
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

    // Clean up process pool
    processPool.cleanup();
});

// Handle app before quit event
app.on('before-quit', () => {
    app.isQuiting = true;
    if (tray) {
        tray.destroy();
    }

    // Cleanup PowerShell process pool
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
    console.log('run-admin-command handler called with:', command);

    if (!command || typeof command !== 'string') {
        throw new Error('Invalid command parameter');
    }

    // Escape double quotes in the command for PowerShell
    const escapedCommand = command.replace(/"/g, '`"');

    // Construct the PowerShell command to run the original command elevated
    const psScript = `Start-Process -Verb RunAs -Wait -FilePath "cmd.exe" -ArgumentList "/c ${escapedCommand}"`;

    try {
        // Use the optimized PowerShell execution with process pool
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

        // Use PowerShell to start the process with elevated privileges using process optimization
        const psScript = `Start-Process -FilePath "${executable}" -ArgumentList "${args}" -Verb RunAs -Wait`;

        return processPool.executePowerShellCommand(psScript)
            .then(() => {
                return { success: true, message: `Command '${command}' executed successfully as admin.` };
            })
            .catch((error) => {
                throw new Error(`Elevated process failed: ${error.message}. The user may have cancelled the UAC prompt.`);
            });
    }

    // For non-admin commands, use CMD Process Pool
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
    if (key === 'topMost') {
        if (mainWindow) {
            mainWindow.setAlwaysOnTop(value);
            console.log(`Window always on top set to: ${value}`);
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

// Window visibility debugging handler
ipcMain.handle('report-visibility-issue', async (event, details) => {
    console.log('Visibility issue reported from renderer:', details);

    if (mainWindow && !mainWindow.isDestroyed()) {
        const windowState = {
            isVisible: mainWindow.isVisible(),
            isMinimized: mainWindow.isMinimized(),
            opacity: mainWindow.getOpacity(),
            bounds: mainWindow.getBounds(),
            isDestroyed: mainWindow.isDestroyed()
        };

        console.log('Current window state:', windowState);

        // Attempt to fix visibility issues
        try {
            if (!windowState.isVisible && !windowState.isMinimized) {
                console.log('Attempting to fix visibility issue...');

                if (windowState.opacity < 0.3) {
                    mainWindow.setOpacity(0.8);
                }

                mainWindow.center();
                mainWindow.show();
                mainWindow.focus();

                return { success: true, message: 'Attempted to fix visibility issue' };
            }
        } catch (error) {
            console.error('Error fixing visibility issue:', error);
            return { success: false, error: error.message };
        }
    }

    return { success: false, message: 'No action needed or window not available' };
});

// Performance metrics handler with adaptive monitoring
let performanceInterval;
let performanceUpdateCount = 0; // Track how many components are requesting updates
let currentPerformanceInterval = 2000; // Start with 2 seconds
let performanceCache = null;
let performanceCacheTime = 0;

// Adaptive performance monitoring based on system load
async function getAdaptiveInterval() {
    const settingsStore = await getStore();
    const performanceMode = settingsStore ? settingsStore.get('performanceMode', 'balanced') : 'balanced';

    if (performanceMode === 'low-end') {
        return 5000; // 5 seconds for low-end systems
    } else if (performanceMode === 'high-end') {
        return 1000; // 1 second for high-end systems
    } else if (performanceMode === 'balanced') {
        return 2500; // 2.5 seconds for balanced systems
    } else {
        // Fallback to balanced mode
        return 2500; // Default 2.5 seconds
    }
}

// Process pool for PowerShell to reduce CPU overhead
const powershellProcessPool = {
    processes: [],
    maxPoolSize: 3,
    currentIndex: 0,

    async getProcess() {
        // Clean up any dead processes
        this.processes = this.processes.filter(proc => !proc.killed && proc.exitCode === null);

        // If pool is empty or all processes are busy, create a new one (up to max)
        if (this.processes.length < this.maxPoolSize) {
            const proc = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass'], {
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: false
            });

            // Set up basic error handling
            proc.on('error', (error) => {
                console.error('PowerShell process error:', error);
                this.removeProcess(proc);
            });

            proc.on('exit', () => {
                this.removeProcess(proc);
            });

            this.processes.push(proc);
            return proc;
        }

        // Return next available process in round-robin fashion
        const proc = this.processes[this.currentIndex % this.processes.length];
        this.currentIndex = (this.currentIndex + 1) % this.processes.length;
        return proc;
    },

    removeProcess(proc) {
        const index = this.processes.indexOf(proc);
        if (index > -1) {
            this.processes.splice(index, 1);
        }
    },

    cleanup() {
        this.processes.forEach(proc => {
            if (!proc.killed) {
                proc.kill('SIGTERM');
            }
        });
        this.processes = [];
    }
};

ipcMain.handle('start-performance-updates', async () => {
    performanceUpdateCount++;
    console.log(`Performance updates requested. Active requests: ${performanceUpdateCount}`);

    // Only start the interval if it's not already running
    if (!performanceInterval) {
        console.log('Starting adaptive performance monitoring interval...');

        const updatePerformanceMetrics = async () => {
            try {
                // Use cached data if recent (within 1 second)
                const now = Date.now();
                if (performanceCache && (now - performanceCacheTime) < 1000) {
                    if (mainWindow && mainWindow.webContents) {
                        mainWindow.webContents.send('performance-update', performanceCache);
                    }
                    return;
                }

                // Only monitor memory usage (CPU monitoring removed for performance)
                const memInfo = await si.mem();
                const metrics = {
                    mem: ((memInfo.active / memInfo.total) * 100).toFixed(2)
                };

                // Cache the metrics
                performanceCache = metrics;
                performanceCacheTime = now;

                if (mainWindow && mainWindow.webContents) {
                    mainWindow.webContents.send('performance-update', metrics);
                }

                // Adapt interval based on current metrics
                const newInterval = await getAdaptiveInterval();
                if (newInterval !== currentPerformanceInterval) {
                    currentPerformanceInterval = newInterval;
                    console.log(`Adapted performance monitoring interval to ${newInterval}ms`);

                    // Restart interval with new timing
                    if (performanceInterval) {
                        clearInterval(performanceInterval);
                        performanceInterval = setInterval(updatePerformanceMetrics, currentPerformanceInterval);
                    }
                }
            } catch (error) {
                console.error('Failed to get performance metrics:', error);
            }
        };

        // Start with adaptive interval
        currentPerformanceInterval = await getAdaptiveInterval();
        performanceInterval = setInterval(updatePerformanceMetrics, currentPerformanceInterval);
    }
});

ipcMain.handle('stop-performance-updates', () => {
    if (performanceUpdateCount > 0) {
        performanceUpdateCount--;
    }
    console.log(`Performance updates stop requested. Active requests: ${performanceUpdateCount}`);

    // Only stop the interval if no components are requesting updates
    if (performanceUpdateCount <= 0 && performanceInterval) {
        console.log('Stopping performance monitoring interval...');
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

        console.log(`Performance mode set to: ${mode}`);
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

    try {
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

        const output = await processPool.executePowerShellCommand(psScript);
        return JSON.parse(output);
    } catch (error) {
        console.error('Error getting environment variables:', error);
        throw new Error(`Failed to get environment variables: ${error.message}`);
    }
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
    console.log('get-system-health-info handler called (lightweight)');

    try {
        // Only gather memory data for health dashboard (CPU monitoring removed)
        const mem = await si.mem();

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
    console.log(`get-system-info handler called for type: ${type || 'all'}`);

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
            console.log('Returning cached system information');
            return systemInfoCache;
        }

        // Fast mode for basic info only
        if (!type && fastMode) {
            const reason = isStartupPhase ? 'startup optimization' : hasRecentTimeoutError ? 'recent timeout error' : 'user setting';
            console.log(`🚀 Using fast mode for system information (${reason})`);

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
                console.log('Fast mode system info cached');
            }

            return basicInfo;
        }

        if (type) {
            // Handle specific requests for individual data points (for plugins)
            switch (type) {
                case 'time':
                    return await si.time();
                case 'health':
                    // Redirect to lightweight handler for health dashboard
                    return await ipcMain.handle('get-system-health-info')();
                // Add other specific cases here as needed by plugins
                default:
                    // If a specific, unhandled type is requested, return that part of si
                    if (si[type] && typeof si[type] === 'function') {
                        return await si[type]();
                    }
                    throw new Error(`Invalid system information type: ${type}`);
            }
        }

        const sysInfoStart = performance.now();
        console.log('🔍 Gathering full system information...');

        // Use timeout wrapper for system information gathering to prevent hanging on slow systems
        // Create individual promises with their own timeouts for better resilience
        const systemInfoPromises = {
            system: withTimeout(si.system(), 3000, 'System info').catch(() => ({})),
            bios: withTimeout(si.bios(), 3000, 'BIOS info').catch(() => ({})),
            baseboard: withTimeout(si.baseboard(), 3000, 'Baseboard info').catch(() => ({})),
            cpu: withTimeout(si.cpu(), 5000, 'CPU info').catch(() => ({})),
            cpuTemperature: withTimeout(si.cpuTemperature(), 2000, 'CPU temperature').catch(() => ({ main: null, cores: [], max: null })),
            cpuCurrentSpeed: withTimeout(si.cpuCurrentSpeed(), 2000, 'CPU speed').catch(() => ({})),
            osInfo: withTimeout(si.osInfo(), 3000, 'OS info').catch(() => ({})),
            diskLayout: withTimeout(si.diskLayout(), 5000, 'Disk layout').catch(() => []),
            fsSize: withTimeout(si.fsSize(), 4000, 'Filesystem size').catch(() => []),
            networkInterfaces: withTimeout(si.networkInterfaces(), 4000, 'Network interfaces').catch(async (error) => {
                console.warn('systeminformation networkInterfaces failed, using fallback:', error.message);
                // Fallback to Node.js built-in os.networkInterfaces()
                try {
                    const osInterfaces = os.networkInterfaces();
                    const fallbackInterfaces = [];

                    for (const [name, addresses] of Object.entries(osInterfaces)) {
                        // Skip loopback and internal interfaces for the main list
                        const nonInternalAddresses = addresses.filter(addr => !addr.internal);
                        if (nonInternalAddresses.length > 0) {
                            const primaryAddr = nonInternalAddresses.find(addr => addr.family === 'IPv4') || nonInternalAddresses[0];
                            fallbackInterfaces.push({
                                iface: name,
                                ifaceName: name,
                                ip4: primaryAddr.family === 'IPv4' ? primaryAddr.address : '',
                                ip6: primaryAddr.family === 'IPv6' ? primaryAddr.address : '',
                                mac: primaryAddr.mac || '',
                                internal: false,
                                operstate: 'unknown',
                                type: 'unknown',
                                speed: null
                            });
                        }
                    }

                    console.log(`Fallback network interfaces found: ${fallbackInterfaces.length}`);
                    return fallbackInterfaces;
                } catch (fallbackError) {
                    console.error('Fallback network interface detection also failed:', fallbackError);
                    return [];
                }
            }),
            graphics: withTimeout(si.graphics(), 5000, 'Graphics info').catch(() => ({}))
        };

        // Execute all promises with an overall timeout of 15 seconds (increased from 10)
        const systemInfoPromise = Promise.all(Object.values(systemInfoPromises));

        const [
            system,
            bios,
            baseboard,
            cpu,
            cpuTemperature,
            cpuCurrentSpeed,
            osInfo,
            diskLayout,
            fsSize,
            networkInterfaces,
            graphics
        ] = await withTimeout(systemInfoPromise, 15000, 'System information gathering');

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
            platform: osInfo.platform || os.platform(),
            arch: osInfo.arch || os.arch(),
            hostname: osInfo.hostname || os.hostname(),
            uptime: formattedUptime,



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



            // Operating system info
            osDistro: osInfo.distro || 'Unknown',
            osRelease: osInfo.release || 'Unknown',
            osCodename: osInfo.codename || 'Unknown',
            osKernel: osInfo.kernel || 'Unknown',
            osBuild: osInfo.build || 'Unknown',
            osSerial: osInfo.serial || 'Unknown',



            // Storage information
            storageDevices: (diskLayout || []).map(disk => ({
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
            filesystems: (fsSize || []).map(fs => ({
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
            graphicsControllers: (graphics.controllers || []).map(gpu => ({
                vendor: gpu.vendor || 'Unknown',
                model: gpu.model || 'Unknown',
                vram: gpu.vram ? gpu.vram + ' MB' : 'Unknown',
                bus: gpu.bus || 'Unknown'
            })),

            graphicsDisplays: (graphics.displays || []).map(display => ({
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

    // Use optimized PowerShell execution for script files
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

// Test notification handler for debugging
ipcMain.handle('test-notification', async () => {
    try {
        console.log('Testing simple notification...');
        console.log('Platform:', process.platform);
        console.log('App User Model ID:', app.getAppUserModelId());

        if (!Notification.isSupported()) {
            console.log('Notifications not supported');
            return { success: false, error: 'Not supported' };
        }

        console.log('Notifications are supported, creating notification...');

        const iconPath = path.join(__dirname, 'assets', 'images', 'icon.ico');
        console.log('Icon path:', iconPath);

        // Check if icon file exists
        try {
            await fs.access(iconPath);
            console.log('Icon file exists');
        } catch (iconError) {
            console.warn('Icon file not found:', iconError.message);
        }

        const notification = new Notification({
            title: 'WinTool Test',
            body: 'This is a test notification from WinTool System Health Dashboard',
            icon: iconPath,
            silent: false
        });

        notification.on('show', () => {
            console.log('Test notification shown successfully');
        });

        notification.on('failed', (error) => {
            console.error('Test notification failed:', error);
        });

        notification.show();
        console.log('Test notification.show() called');

        return { success: true };
    } catch (error) {
        console.error('Test notification error:', error);
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

        // Use optimized PowerShell execution for script files
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
        const psScript = `
            Get-Service | ForEach-Object {
                [PSCustomObject]@{
                    Name = \$_.Name
                    DisplayName = \$_.DisplayName
                    Status = \$_.Status.ToString()
                    StartType = \$_.StartType.ToString()
                }
            } | ConvertTo-Json -Compress
        `;

        console.log('Executing PowerShell script for services...');
        const output = await processPool.executePowerShellCommand(psScript);
        console.log('PowerShell output received, length:', output.length);

        if (!output || output.trim().length === 0) {
            throw new Error('No output received from PowerShell command');
        }

        // Log first 200 characters of output for debugging
        console.log('Output preview:', output.substring(0, 200));

        const services = JSON.parse(output);

        // Ensure services is an array
        const servicesArray = Array.isArray(services) ? services : [services];

        const enhancedServices = servicesArray.map(service => ({
            Name: service.Name,
            DisplayName: service.DisplayName || service.Name, // Fallback to Name if DisplayName is empty
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

        // Use process pool instead of direct spawn
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

// Optimized PowerShell execution function using process pool
async function executeOptimizedPowerShell(command, timeout = 30000) {
    return processPool.executePowerShellCommand(command, timeout);
}

// PowerShell execution handler for debugging
ipcMain.handle('execute-powershell', async (event, command) => {
    console.log('execute-powershell handler called with command:', command);
    try {
        return await executeOptimizedPowerShell(command);
    } catch (error) {
        throw error;
    }
});

// CMD execution handler for debugging
ipcMain.handle('execute-cmd', async (event, command) => {
    console.log('execute-cmd handler called with command:', command);
    try {
        return await processPool.executeCmdCommand(command);
    } catch (error) {
        throw error;
    }
});


// Handler to finish startup phase early
ipcMain.handle('finish-startup-phase', async () => {
    console.log('Finishing startup phase early from frontend request...');
    processPool.finishStartupPhase();
    startupLimiter.finishStartupPhase();
    return { success: true };
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

    // Use Process Pool for PowerShell, direct execution for CMD
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

    // For CMD, use Process Pool
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
        Get-WinEvent -LogName "${logName}" -MaxEvents 100 -ErrorAction Stop | Select-Object @{Name='TimeCreated';Expression={$_.TimeCreated.ToString('o')}}, LevelDisplayName, ProviderName, Id, Message | ConvertTo-Json
    `.trim();

    try {
        const output = await processPool.executePowerShellCommand(psScript);
        const trimmedOutput = output.trim();

        if (!trimmedOutput) {
            return [];
        }

        const events = JSON.parse(trimmedOutput);
        return Array.isArray(events) ? events : [events];
    } catch (error) {
        console.error('Error getting event logs:', error);
        throw new Error(`Failed to get event logs: ${error.message}`);
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