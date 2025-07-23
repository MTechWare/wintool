/**
 * Plugin Development Server
 * Provides hot reload, debugging, and development utilities for plugin development
 */

const fs = require('fs').promises;
const path = require('path');
const chokidar = require('chokidar');
const { EventEmitter } = require('events');
const PluginValidator = require('../security/plugin-validator');

class PluginDevServer extends EventEmitter {
    constructor(options = {}) {
        super();
        this.options = {
            watchPath: options.watchPath || path.join(process.env.LOCALAPPDATA || process.env.APPDATA, 'MTechTool', 'Plugins'),
            devPath: options.devPath || path.join(__dirname, '..', '..', 'src', 'plugins'),
            hotReload: options.hotReload !== false,
            autoValidate: options.autoValidate !== false,
            debugMode: options.debugMode || false,
            ...options
        };
        
        this.watchers = new Map();
        this.pluginStates = new Map();
        this.validator = new PluginValidator();
        this.isRunning = false;
    }

    /**
     * Start the development server
     */
    async start() {
        if (this.isRunning) {
            console.log('Development server is already running');
            return;
        }

        console.log('🚀 Starting Plugin Development Server...');
        console.log(`📁 Watching: ${this.options.watchPath}`);
        console.log(`🔧 Dev Path: ${this.options.devPath}`);

        // Ensure directories exist
        await this.ensureDirectories();

        // Start watching for changes
        if (this.options.hotReload) {
            await this.startWatching();
        }

        // Initial scan of plugins
        await this.scanPlugins();

        this.isRunning = true;
        console.log('✅ Plugin Development Server started');
        
        this.emit('started');
    }

    /**
     * Stop the development server
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }

        console.log('🛑 Stopping Plugin Development Server...');

        // Stop all watchers
        for (const [pluginId, watcher] of this.watchers) {
            await watcher.close();
        }
        this.watchers.clear();

        this.isRunning = false;
        console.log('✅ Plugin Development Server stopped');
        
        this.emit('stopped');
    }

    /**
     * Ensure required directories exist
     */
    async ensureDirectories() {
        const dirs = [this.options.watchPath, this.options.devPath];
        
        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                console.warn(`Failed to create directory ${dir}:`, error.message);
            }
        }
    }

    /**
     * Start watching for file changes
     */
    async startWatching() {
        const watchPaths = [this.options.watchPath, this.options.devPath];
        
        for (const watchPath of watchPaths) {
            try {
                await fs.access(watchPath);
                
                const watcher = chokidar.watch(watchPath, {
                    ignored: /(^|[\/\\])\../, // ignore dotfiles
                    persistent: true,
                    ignoreInitial: true,
                    depth: 2
                });

                watcher
                    .on('change', (filePath) => this.handleFileChange(filePath))
                    .on('add', (filePath) => this.handleFileAdd(filePath))
                    .on('unlink', (filePath) => this.handleFileDelete(filePath))
                    .on('addDir', (dirPath) => this.handleDirectoryAdd(dirPath))
                    .on('unlinkDir', (dirPath) => this.handleDirectoryDelete(dirPath));

                this.watchers.set(watchPath, watcher);
                console.log(`👀 Watching: ${watchPath}`);
            } catch (error) {
                console.warn(`Cannot watch ${watchPath}:`, error.message);
            }
        }
    }

    /**
     * Handle file change events
     */
    async handleFileChange(filePath) {
        const pluginPath = this.getPluginPath(filePath);
        const pluginId = path.basename(pluginPath);
        
        console.log(`📝 File changed: ${path.relative(pluginPath, filePath)}`);
        
        // Validate plugin if auto-validation is enabled
        if (this.options.autoValidate) {
            await this.validatePlugin(pluginId, pluginPath);
        }
        
        // Emit change event for hot reload
        this.emit('pluginChanged', {
            pluginId,
            pluginPath,
            changedFile: filePath,
            changeType: 'modified'
        });
    }

    /**
     * Handle file add events
     */
    async handleFileAdd(filePath) {
        const pluginPath = this.getPluginPath(filePath);
        const pluginId = path.basename(pluginPath);
        
        console.log(`➕ File added: ${path.relative(pluginPath, filePath)}`);
        
        this.emit('pluginChanged', {
            pluginId,
            pluginPath,
            changedFile: filePath,
            changeType: 'added'
        });
    }

    /**
     * Handle file delete events
     */
    async handleFileDelete(filePath) {
        const pluginPath = this.getPluginPath(filePath);
        const pluginId = path.basename(pluginPath);
        
        console.log(`🗑️ File deleted: ${path.relative(pluginPath, filePath)}`);
        
        this.emit('pluginChanged', {
            pluginId,
            pluginPath,
            changedFile: filePath,
            changeType: 'deleted'
        });
    }

    /**
     * Handle directory add events
     */
    async handleDirectoryAdd(dirPath) {
        // Check if this is a new plugin directory
        if (this.isPluginDirectory(dirPath)) {
            const pluginId = path.basename(dirPath);
            console.log(`📦 New plugin detected: ${pluginId}`);
            
            await this.initializePlugin(pluginId, dirPath);
            
            this.emit('pluginAdded', {
                pluginId,
                pluginPath: dirPath
            });
        }
    }

    /**
     * Handle directory delete events
     */
    async handleDirectoryDelete(dirPath) {
        if (this.isPluginDirectory(dirPath)) {
            const pluginId = path.basename(dirPath);
            console.log(`🗑️ Plugin removed: ${pluginId}`);
            
            this.pluginStates.delete(pluginId);
            
            this.emit('pluginRemoved', {
                pluginId,
                pluginPath: dirPath
            });
        }
    }

    /**
     * Get plugin directory path from file path
     */
    getPluginPath(filePath) {
        const watchPaths = [this.options.watchPath, this.options.devPath];
        
        for (const watchPath of watchPaths) {
            if (filePath.startsWith(watchPath)) {
                const relativePath = path.relative(watchPath, filePath);
                const pluginDir = relativePath.split(path.sep)[0];
                return path.join(watchPath, pluginDir);
            }
        }
        
        return path.dirname(filePath);
    }

    /**
     * Check if directory is a plugin directory
     */
    isPluginDirectory(dirPath) {
        const watchPaths = [this.options.watchPath, this.options.devPath];
        
        for (const watchPath of watchPaths) {
            if (path.dirname(dirPath) === watchPath) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Initialize a new plugin
     */
    async initializePlugin(pluginId, pluginPath) {
        console.log(`🔧 Initializing plugin: ${pluginId}`);
        
        const state = {
            id: pluginId,
            path: pluginPath,
            lastValidation: null,
            isValid: false,
            errors: [],
            warnings: []
        };
        
        // Validate plugin
        if (this.options.autoValidate) {
            await this.validatePlugin(pluginId, pluginPath);
        }
        
        this.pluginStates.set(pluginId, state);
    }

    /**
     * Validate a plugin
     */
    async validatePlugin(pluginId, pluginPath) {
        try {
            console.log(`🔍 Validating plugin: ${pluginId}`);
            
            const validation = await this.validator.validatePlugin(pluginPath);
            const state = this.pluginStates.get(pluginId) || {};
            
            state.lastValidation = new Date();
            state.isValid = validation.isValid;
            state.errors = validation.errors;
            state.warnings = validation.warnings;
            state.securityIssues = validation.securityIssues;
            
            this.pluginStates.set(pluginId, state);
            
            // Log validation results
            if (validation.isValid) {
                console.log(`✅ Plugin ${pluginId} is valid`);
            } else {
                console.log(`❌ Plugin ${pluginId} has validation errors:`);
                validation.errors.forEach(error => console.log(`   • ${error}`));
            }
            
            if (validation.warnings.length > 0) {
                console.log(`⚠️ Plugin ${pluginId} warnings:`);
                validation.warnings.forEach(warning => console.log(`   • ${warning}`));
            }
            
            this.emit('pluginValidated', {
                pluginId,
                pluginPath,
                validation
            });
            
            return validation;
        } catch (error) {
            console.error(`Failed to validate plugin ${pluginId}:`, error);
            return null;
        }
    }

    /**
     * Scan all plugins in watch directories
     */
    async scanPlugins() {
        console.log('🔍 Scanning for plugins...');
        
        const watchPaths = [this.options.watchPath, this.options.devPath];
        let totalPlugins = 0;
        
        for (const watchPath of watchPaths) {
            try {
                await fs.access(watchPath);
                const items = await fs.readdir(watchPath);
                
                for (const item of items) {
                    const itemPath = path.join(watchPath, item);
                    const stats = await fs.stat(itemPath);
                    
                    if (stats.isDirectory()) {
                        await this.initializePlugin(item, itemPath);
                        totalPlugins++;
                    }
                }
            } catch (error) {
                console.warn(`Cannot scan ${watchPath}:`, error.message);
            }
        }
        
        console.log(`📦 Found ${totalPlugins} plugins`);
    }

    /**
     * Get plugin development status
     */
    getPluginStatus(pluginId) {
        return this.pluginStates.get(pluginId) || null;
    }

    /**
     * Get all plugin statuses
     */
    getAllPluginStatuses() {
        return Array.from(this.pluginStates.values());
    }

    /**
     * Generate development report
     */
    generateDevReport() {
        const plugins = this.getAllPluginStatuses();
        const validPlugins = plugins.filter(p => p.isValid);
        const invalidPlugins = plugins.filter(p => !p.isValid);
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalPlugins: plugins.length,
                validPlugins: validPlugins.length,
                invalidPlugins: invalidPlugins.length,
                serverRunning: this.isRunning
            },
            plugins: plugins.map(plugin => ({
                id: plugin.id,
                path: plugin.path,
                isValid: plugin.isValid,
                errorCount: plugin.errors?.length || 0,
                warningCount: plugin.warnings?.length || 0,
                securityIssueCount: plugin.securityIssues?.length || 0,
                lastValidation: plugin.lastValidation
            }))
        };
        
        return report;
    }

    /**
     * Enable debug mode
     */
    enableDebugMode() {
        this.options.debugMode = true;
        console.log('🐛 Debug mode enabled');
    }

    /**
     * Disable debug mode
     */
    disableDebugMode() {
        this.options.debugMode = false;
        console.log('🐛 Debug mode disabled');
    }
}

module.exports = PluginDevServer;
