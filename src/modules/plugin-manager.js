/**
 * Plugin Management Module
 * Handles plugin loading, backend management, and plugin-related functionality
 */

const { ipcMain, dialog, shell, app } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const crypto = require('crypto');
const extract = require('extract-zip');

class PluginManager {
    /**
     * Creates a new PluginManager instance.
     * Initializes plugin backend storage, verified hashes, and sets up IPC handlers.
     *
     * @constructor
     */
    constructor() {
        this.loadedPluginBackends = new Map();
        this.verifiedHashes = {};

        // Bind methods to preserve context
        this.getPluginMap = this.getPluginMap.bind(this);
        this.loadPluginBackends = this.loadPluginBackends.bind(this);
        this.updateVerifiedPluginsList = this.updateVerifiedPluginsList.bind(this);
        this.calculateDirectoryHash = this.calculateDirectoryHash.bind(this);

        this.setupIpcHandlers();
        this.initializeVerifiedPlugins();
    }

    /**
     * Set up IPC handlers for plugin management and communication.
     * Handles plugin invocation, tab management, and plugin installation.
     *
     * @returns {void}
     */
    setupIpcHandlers() {
        // Plugin backend communication
        ipcMain.handle('plugin-invoke', async (event, pluginId, handlerName, ...args) => {
            const pluginBackend = this.loadedPluginBackends.get(pluginId);
            if (
                pluginBackend &&
                pluginBackend.handlers &&
                typeof pluginBackend.handlers[handlerName] === 'function'
            ) {
                return await pluginBackend.handlers[handlerName](...args);
            } else {
                throw new Error(`Handler '${handlerName}' not found for plugin '${pluginId}'`);
            }
        });

        // Plugin management handlers
        ipcMain.handle('get-tab-folders', async () => {
            console.log('get-tab-folders handler called');
            const disabledPlugins = await this.settingsManager.getDisabledPlugins();
            const tabs = [];
            const plugins = [];

            // 1. Read built-in tabs from the installation directory
            const tabsPath = path.join(__dirname, '..', 'tabs');
            try {
                const items = await fs.readdir(tabsPath);
                for (const item of items) {
                    const itemPath = path.join(tabsPath, item);
                    const stat = await fs.stat(itemPath);
                    if (stat.isDirectory()) {
                        tabs.push({ name: item, type: 'tab' });
                    }
                }
            } catch (error) {
                console.error(`Could not read built-in tabs directory: ${tabsPath}`, error);
            }

            // 2. Read enabled plugins from both dev and user locations
            const pluginMap = await this.getPluginMap();
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

        ipcMain.handle('get-all-plugins', async () => {
            console.log('get-all-plugins handler called');
            const pluginMap = await this.getPluginMap();
            const disabledPlugins = await this.settingsManager.getDisabledPlugins();

            const allPlugins = await Promise.all(
                Array.from(pluginMap.entries()).map(async ([pluginId, pluginPath]) => {
                    const configPath = path.join(pluginPath, 'plugin.json');
                    let config = {};
                    try {
                        const configData = await fs.readFile(configPath, 'utf8');
                        config = JSON.parse(configData);
                    } catch (e) {
                        console.error(`Could not read plugin.json for ${pluginId}:`, e);
                        config = {
                            name: pluginId,
                            description: 'Could not load plugin manifest.',
                            icon: 'fas fa-exclamation-triangle',
                        };
                    }

                    // Verification Logic
                    const directoryHash = await this.calculateDirectoryHash(pluginPath);
                    const isVerified = this.verifiedHashes[pluginId] === directoryHash;

                    return {
                        id: pluginId,
                        name: config.name || pluginId,
                        description: config.description || 'No description available.',
                        version: config.version || 'N/A',
                        author: config.author || 'Unknown',
                        icon: config.icon || 'fas fa-cog',
                        enabled: !disabledPlugins.includes(pluginId),
                        verified: isVerified,
                        hash: directoryHash,
                    };
                })
            );

            return allPlugins;
        });

        ipcMain.handle('delete-plugin', async (event, pluginId) => {
            // For security, we only allow deleting from the user-writable plugins path
            const userPluginsPath = this.getPluginsPath();
            const pluginPath = path.join(userPluginsPath, pluginId);

            try {
                await fs.access(pluginPath);
            } catch (error) {
                return {
                    success: false,
                    message: 'Plugin not found or it is a core plugin that cannot be deleted.',
                };
            }

            // Confirm with the user
            const mainWindow = this.windowManager ? this.windowManager.getMainWindow() : null;
            if (mainWindow) {
                const choice = await dialog.showMessageBox(mainWindow, {
                    type: 'warning',
                    title: 'Delete Plugin',
                    message: `Are you sure you want to permanently delete the plugin "${pluginId}"?`,
                    detail: 'This action cannot be undone. The plugin files will be removed from your computer.',
                    buttons: ['Delete', 'Cancel'],
                    defaultId: 1,
                    cancelId: 1,
                });

                if (choice.response === 1) {
                    // User canceled
                    return { success: true, restarted: false };
                }
            }

            try {
                // Delete the plugin folder
                await fs.rm(pluginPath, { recursive: true, force: true });

                // Also remove it from the disabled list if it's there
                await this.settingsManager.removePluginFromDisabled(pluginId);

                // Notify and restart
                if (mainWindow) {
                    await dialog.showMessageBox(mainWindow, {
                        type: 'info',
                        title: 'Plugin Deleted',
                        message: `The plugin "${pluginId}" has been deleted.`,
                        detail: 'The application must be restarted for the changes to take effect.',
                        buttons: ['Restart Now'],
                    });
                }

                if (this.restartApp) {
                    this.restartApp();
                }
                return { success: true, restarted: true };
            } catch (error) {
                console.error(`Failed to delete plugin ${pluginId}:`, error);
                return { success: false, message: `Error deleting plugin: ${error.message}` };
            }
        });

        ipcMain.handle('install-plugin', async () => {
            const userPluginsPath = this.getPluginsPath();

            // Show open file dialog to select the plugin zip
            const mainWindow = this.windowManager ? this.windowManager.getMainWindow() : null;
            if (!mainWindow) {
                return { success: false, message: 'Main window not available.' };
            }

            const result = await dialog.showOpenDialog(mainWindow, {
                title: 'Select Plugin ZIP File',
                properties: ['openFile'],
                filters: [
                    { name: 'Plugin Packages', extensions: ['zip'] },
                    { name: 'All Files', extensions: ['*'] },
                ],
            });

            if (result.canceled || result.filePaths.length === 0) {
                return { success: false, message: 'No file selected.' };
            }

            const zipPath = result.filePaths[0];

            // Extract the zip file to a temporary directory first to inspect it
            const tempDir = path.join(os.tmpdir(), `wintool-plugin-${Date.now()}`);
            await fs.mkdir(tempDir, { recursive: true });

            try {
                await extract(zipPath, { dir: tempDir });

                // Validate the plugin structure (check for plugin.json)
                const items = await fs.readdir(tempDir);
                const rootDir = items.length === 1 ? path.join(tempDir, items[0]) : tempDir;

                const manifestPath = path.join(rootDir, 'plugin.json');
                await fs.access(manifestPath); // Throws if not found

                // Determine the final plugin folder name and path
                const pluginName = path.basename(rootDir);
                const finalPath = path.join(userPluginsPath, pluginName);

                // Check if plugin already exists
                try {
                    await fs.access(finalPath);
                    return { success: false, message: `Plugin "${pluginName}" already exists.` };
                } catch (e) {
                    // Doesn't exist, which is good
                }

                // Move the validated plugin from temp to the final plugins directory
                await fs.rename(rootDir, finalPath);

                // Notify the user and ask to restart
                const restartChoice = await dialog.showMessageBox(mainWindow, {
                    type: 'info',
                    title: 'Plugin Installed',
                    message: `Plugin "${pluginName}" has been installed successfully.`,
                    detail: 'The application needs to be restarted for the changes to take effect.',
                    buttons: ['Restart Now', 'Later'],
                    defaultId: 0,
                    cancelId: 1,
                });

                if (restartChoice.response === 0) {
                    // "Restart Now"
                    if (this.restartApp) {
                        this.restartApp();
                    }
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
            const userPluginsPath = this.getPluginsPath();
            console.log(`Opening user plugins directory: ${userPluginsPath}`);
            await shell.openPath(userPluginsPath);
            return true;
        });

        ipcMain.handle('run-plugin-script', async (event, pluginId, scriptPath) => {
            // Security Validation
            if (
                !pluginId ||
                !scriptPath ||
                typeof pluginId !== 'string' ||
                typeof scriptPath !== 'string'
            ) {
                throw new Error('Invalid pluginId or scriptPath.');
            }

            // Find the correct path for the given pluginId from our map
            const pluginMap = await this.getPluginMap();
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

            const scriptCommand = `& "${fullScriptPath}"`;

            try {
                const output = await this.processPool.executePowerShellCommand(scriptCommand);
                return output;
            } catch (error) {
                throw new Error(`Plugin script execution failed: ${error.message}`);
            }
        });

        // Plugin notification handler
        ipcMain.on('plugin-show-notification', (event, { title, body, type }) => {
            const mainWindow = this.windowManager ? this.windowManager.getMainWindow() : null;
            if (mainWindow) {
                mainWindow.webContents.send('display-notification', { title, body, type });
            }
        });

        // Plugin file dialog handlers
        ipcMain.handle('plugin-show-open-dialog', async (event, options) => {
            const mainWindow = this.windowManager ? this.windowManager.getMainWindow() : null;
            if (!mainWindow) {
                return { canceled: true, file: null };
            }

            const result = await dialog.showOpenDialog(mainWindow, options);
            if (result.canceled || result.filePaths.length === 0) {
                return { canceled: true, file: null };
            }
            const filePath = result.filePaths[0];
            const content = await fs.readFile(filePath, 'utf8');
            return { canceled: false, file: { path: filePath, content: content } };
        });

        ipcMain.handle('plugin-show-save-dialog', async (event, options, content) => {
            const mainWindow = this.windowManager ? this.windowManager.getMainWindow() : null;
            if (!mainWindow) {
                return { canceled: true, path: null };
            }

            const result = await dialog.showSaveDialog(mainWindow, options);
            if (result.canceled || !result.filePath) {
                return { canceled: true, path: null };
            }
            await fs.writeFile(result.filePath, content, 'utf8');
            return { canceled: false, path: result.filePath };
        });

        // Verified plugins handlers
        ipcMain.handle('refresh-verified-plugins', async () => {
            console.log('refresh-verified-plugins handler called');
            try {
                await this.updateVerifiedPluginsList();
                return { success: true, message: 'Verified plugins list refreshed successfully' };
            } catch (error) {
                console.error('Failed to refresh verified plugins list:', error);
                return { success: false, message: error.message };
            }
        });

        ipcMain.handle('get-verified-plugins', async () => {
            console.log('get-verified-plugins handler called');
            return {
                success: true,
                verifiedHashes: { ...this.verifiedHashes },
                count: Object.keys(this.verifiedHashes).length,
            };
        });

        // Tab content handler
        ipcMain.handle('get-tab-content', async (event, tabFolder) => {
            return await this.getTabContent(tabFolder);
        });
    }

    /**
     * Set dependencies for the plugin manager using dependency injection.
     * Allows injection of settings manager, window manager, process pool, and restart function.
     *
     * @param {Object} dependencies - Object containing dependency instances
     * @param {Object} dependencies.settingsManager - Settings manager instance
     * @param {Object} dependencies.windowManager - Window manager instance
     * @param {Object} dependencies.processPool - Process pool for command execution
     * @param {Function} dependencies.restartApp - Function to restart the application
     * @returns {void}
     */
    setDependencies(dependencies) {
        this.settingsManager = dependencies.settingsManager;
        this.windowManager = dependencies.windowManager;
        this.processPool = dependencies.processPool;
        this.restartApp = dependencies.restartApp;
    }

    /**
     * Gets the correct, user-writable path for storing plugins
     */
    getPluginsPath() {
        let basePath;

        if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
            basePath = process.env.LOCALAPPDATA;
        } else {
            basePath = app.getPath('userData');
        }

        const pluginsPath = path.join(basePath, 'MTechWare', 'WinTool', 'Plugins');
        return pluginsPath;
    }

    /**
     * Ensures the plugins directory exists
     */
    async ensurePluginsDirectoryExists() {
        try {
            const pluginsPath = this.getPluginsPath();
            await fs.mkdir(pluginsPath, { recursive: true });
        } catch (error) {
            console.error('Failed to create plugins directory:', error);
        }
    }

    /**
     * Scans both development and user plugin directories and returns a map
     * of unique plugin IDs to their full paths. User plugins override dev plugins.
     */
    async getPluginMap() {
        const devPluginsPath = path.join(__dirname, '..', 'plugins');
        const userPluginsPath = this.getPluginsPath();
        const pluginMap = new Map();

        const readFoldersFromDir = async dirPath => {
            try {
                const items = await fs.readdir(dirPath);
                const directories = [];
                for (const item of items) {
                    const itemPath = path.join(dirPath, item);
                    const stat = await fs.stat(itemPath);
                    if (stat.isDirectory()) {
                        directories.push({ name: item, path: itemPath });
                    }
                }
                return directories;
            } catch (error) {
                return [];
            }
        };

        // Load development plugins first
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

        // Load user-installed plugins (overrides dev plugins if name conflicts)
        const userPlugins = await readFoldersFromDir(userPluginsPath);
        for (const plugin of userPlugins) {
            pluginMap.set(plugin.name, plugin.path);
        }

        return pluginMap;
    }

    /**
     * Load plugin backends
     */
    async loadPluginBackends() {
        const pluginMap = await this.getPluginMap();

        // Batch plugin loading to reduce concurrent processes
        const pluginEntries = Array.from(pluginMap.entries());
        const batchSize = 5;

        for (let i = 0; i < pluginEntries.length; i += batchSize) {
            const batch = pluginEntries.slice(i, i + batchSize);

            await Promise.all(
                batch.map(async ([pluginId, pluginPath]) => {
                    // Check for automatic dependency installation
                    await this.ensurePluginDependencies(pluginId, pluginPath);

                    const backendScriptPath = path.join(pluginPath, 'backend.js');
                    try {
                        await fs.stat(backendScriptPath);

                        // Conditionally clear the module from the cache based on the setting
                        const clearPluginCache = await this.settingsManager.getSetting(
                            'clearPluginCache',
                            false
                        );
                        if (clearPluginCache) {
                            delete require.cache[require.resolve(backendScriptPath)];
                        }

                        const pluginModule = require(backendScriptPath);
                        if (pluginModule && typeof pluginModule.initialize === 'function') {
                            // Create a secure API for this specific plugin's backend
                            const backendApi = {
                                handlers: {},
                                registerHandler(name, func) {
                                    this.handlers[name] = async (...args) => func(...args);
                                },
                                getStore: () => this.settingsManager.getStore(),
                                dialog: dialog,
                                get axios() {
                                    return require('axios');
                                },
                                require: moduleName => {
                                    try {
                                        return require(
                                            path.join(pluginPath, 'node_modules', moduleName)
                                        );
                                    } catch (e) {
                                        console.error(
                                            `Failed to load module '${moduleName}' for plugin '${pluginId}'. Make sure it is listed in the plugin's package.json.`
                                        );
                                        throw e;
                                    }
                                },
                            };

                            // Initialize the plugin with its dedicated, secure API
                            pluginModule.initialize(backendApi);
                            this.loadedPluginBackends.set(pluginId, backendApi);
                        }
                    } catch (e) {
                        if (e.code !== 'ENOENT') {
                            console.error(`Error loading backend for plugin ${pluginId}:`, e);
                        }
                    }
                })
            );

            // Reduced delay between batches for faster startup
            if (i + batchSize < pluginEntries.length) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
    }

    /**
     * Ensure plugin dependencies are installed
     * Automatically installs dependencies if package.json exists and node_modules is missing
     */
    async ensurePluginDependencies(pluginId, pluginPath) {
        try {
            const packageJsonPath = path.join(pluginPath, 'package.json');
            const nodeModulesPath = path.join(pluginPath, 'node_modules');

            // Check if package.json exists
            try {
                await fs.stat(packageJsonPath);
            } catch (e) {
                // No package.json, no dependencies to install
                return;
            }

            // Check if node_modules exists and is not empty
            try {
                const nodeModulesStats = await fs.stat(nodeModulesPath);
                if (nodeModulesStats.isDirectory()) {
                    const nodeModulesContents = await fs.readdir(nodeModulesPath);
                    if (nodeModulesContents.length > 0) {
                        // node_modules exists and has content, assume dependencies are installed
                        return;
                    }
                }
            } catch (e) {
                // node_modules doesn't exist, need to install dependencies
            }

            // Read package.json to check if there are dependencies to install
            const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
            const packageJson = JSON.parse(packageJsonContent);

            if (!packageJson.dependencies && !packageJson.devDependencies) {
                // No dependencies to install
                return;
            }

            console.log(`Installing dependencies for plugin '${pluginId}'...`);

            // Install dependencies using npm
            const { spawn } = require('child_process');

            await new Promise((resolve, reject) => {
                const npmProcess = spawn('npm', ['install'], {
                    cwd: pluginPath,
                    stdio: ['ignore', 'pipe', 'pipe'],
                    shell: true
                });

                let stdout = '';
                let stderr = '';

                npmProcess.stdout.on('data', (data) => {
                    stdout += data.toString();
                });

                npmProcess.stderr.on('data', (data) => {
                    stderr += data.toString();
                });

                npmProcess.on('close', (code) => {
                    if (code === 0) {
                        console.log(`Successfully installed dependencies for plugin '${pluginId}'`);
                        resolve();
                    } else {
                        console.error(`Failed to install dependencies for plugin '${pluginId}': ${stderr}`);
                        reject(new Error(`npm install failed with code ${code}: ${stderr}`));
                    }
                });

                npmProcess.on('error', (error) => {
                    console.error(`Failed to start npm install for plugin '${pluginId}': ${error.message}`);
                    reject(error);
                });
            });

        } catch (error) {
            console.error(`Error ensuring dependencies for plugin '${pluginId}': ${error.message}`);
            // Don't throw the error, just log it so plugin loading can continue
        }
    }

    /**
     * Calculate the hash of a directory's contents
     */
    async calculateDirectoryHash(directory) {
        const hash = crypto.createHash('sha256');
        const files = await fs.readdir(directory);

        for (const file of files) {
            const filePath = path.join(directory, file);
            const stat = await fs.stat(filePath);

            if (stat.isFile()) {
                const content = await fs.readFile(filePath);
                hash.update(content);
            }
        }

        return hash.digest('hex');
    }

    /**
     * Fetch verified plugins list from GitHub
     */
    async updateVerifiedPluginsList() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(
                'https://raw.githubusercontent.com/MTechWare/wintool/refs/heads/main/src/config/verified-plugins.json',
                {
                    signal: controller.signal,
                    headers: {
                        'Cache-Control': 'no-cache',
                        'User-Agent': 'WinTool/1.0',
                    },
                }
            );

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                if (data && data.verified_hashes && typeof data.verified_hashes === 'object') {
                    Object.assign(this.verifiedHashes, data.verified_hashes);
                } else {
                    throw new Error('Invalid response format from GitHub');
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Failed to fetch verified plugins list from GitHub:', error.message);
            Object.keys(this.verifiedHashes).forEach(key => delete this.verifiedHashes[key]);
        }
    }

    /**
     * Initialize verified plugins list
     */
    initializeVerifiedPlugins() {
        this.updateVerifiedPluginsList();
        // Refresh verified plugins list periodically (every 30 minutes)
        setInterval(() => this.updateVerifiedPluginsList(), 30 * 60 * 1000);
    }

    /**
     * Get tab content (handles both built-in tabs and plugins)
     */
    async getTabContent(tabFolder) {
        console.log('get-tab-content handler called for:', tabFolder);

        // Determine the base path (could be a built-in 'tab' or a 'plugin')
        let tabPath;
        let isPlugin = false;

        // First, check if it's a built-in tab
        const builtInTabPath = path.join(__dirname, '..', 'tabs', tabFolder);
        try {
            const configPathForCheck = path.join(builtInTabPath, 'config.json');
            await fs.stat(configPathForCheck);
            tabPath = builtInTabPath;
        } catch (e) {
            // If not a built-in tab, check if it's a plugin
            const pluginMap = await this.getPluginMap();
            const pluginPath = pluginMap.get(tabFolder);
            if (pluginPath) {
                tabPath = pluginPath;
                isPlugin = true;
            } else {
                console.error(
                    `Folder for '${tabFolder}' not found in built-in tabs or any plugin directories.`
                );
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
                    description: 'Custom tab/plugin',
                };
            }

            // Read HTML content
            const htmlPath = path.join(tabPath, 'index.html');
            let htmlContent = '';
            try {
                htmlContent = await fs.readFile(htmlPath, 'utf8');
            } catch (htmlError) {
                console.log(`No index.html found for ${tabFolder}`);
                htmlContent = `<div class="tab-content"><h2>${config.name || tabFolder}</h2><p>No content available.</p></div>`;
            }

            // Read CSS content
            const cssPath = path.join(tabPath, 'styles.css');
            let cssContent = '';
            try {
                cssContent = await fs.readFile(cssPath, 'utf8');
            } catch (cssError) {
                // CSS is optional
            }

            // Read JS content
            const jsPath = path.join(tabPath, 'script.js');
            let jsContent = '';
            try {
                jsContent = await fs.readFile(jsPath, 'utf8');
            } catch (jsError) {
                // JS is optional
            }

            return {
                config,
                html: htmlContent,
                css: cssContent,
                js: jsContent,
                isPlugin,
            };
        } catch (error) {
            console.error(`Error reading content for ${tabFolder}:`, error);
            throw new Error(`Failed to load content for '${tabFolder}': ${error.message}`);
        }
    }
}

module.exports = PluginManager;
