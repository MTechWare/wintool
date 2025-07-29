/**
 * Security Integration Module
 * Integrates enhanced plugin security system with the main WinTool application
 */

const PluginSecurityManager = require('./plugin-security-manager');
const PluginValidator = require('./plugin-validator');
const fs = require('fs').promises;
const path = require('path');

class SecurityIntegration {
    constructor(mainApp) {
        this.mainApp = mainApp;
        this.securityManager = new PluginSecurityManager();
        this.validator = new PluginValidator();
        this.isInitialized = false;
    }

    /**
     * Initialize security integration
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }

        console.log('Initializing enhanced plugin security...');

        // Initialize security manager
        await this.securityManager.initialize();

        // Set up event listeners
        this.setupEventListeners();

        // Integrate with existing plugin loading
        this.integrateWithPluginLoader();

        this.isInitialized = true;
        console.log('Enhanced plugin security initialized');
    }

    /**
     * Set up event listeners for security events
     */
    setupEventListeners() {
        // Security violation handling
        this.securityManager.on('securityViolation', event => {
            console.warn('Security violation detected:', event);

            // Notify main application
            if (this.mainApp.emit) {
                this.mainApp.emit('pluginSecurityViolation', event);
            }

            // Take appropriate action
            this.handleSecurityViolation(event);
        });

        // Plugin termination
        this.securityManager.on('pluginTerminated', event => {
            console.log('Plugin terminated due to security violation:', event);

            // Notify UI to remove plugin tab
            if (this.mainApp.webContents) {
                this.mainApp.webContents.send('plugin-terminated', event);
            }
        });

        // Suspicious activity monitoring
        this.securityManager.on('suspiciousActivity', event => {
            console.warn('Suspicious plugin activity:', event);

            // Log for analysis
            this.logSecurityEvent('suspicious_activity', event);
        });

        // Sandbox creation/destruction
        this.securityManager.on('sandboxCreated', event => {
            console.log(`Sandbox created for plugin: ${event.pluginId}`);
        });

        this.securityManager.on('sandboxDestroyed', event => {
            console.log(`Sandbox destroyed for plugin: ${event.pluginId}`);
        });
    }

    /**
     * Integrate with existing plugin loading system
     */
    integrateWithPluginLoader() {
        // Override the original plugin loading function
        const originalLoadPluginBackends = this.mainApp.loadPluginBackends;

        if (originalLoadPluginBackends) {
            this.mainApp.loadPluginBackends = async pluginMap => {
                return await this.secureLoadPluginBackends(pluginMap, originalLoadPluginBackends);
            };
        }
    }

    /**
     * Secure plugin backend loading with enhanced security
     */
    async secureLoadPluginBackends(pluginMap, originalLoader) {
        console.log('Loading plugin backends with enhanced security...');

        const loadedPluginBackends = new Map();

        for (const [pluginId, pluginPath] of pluginMap.entries()) {
            try {
                // Validate plugin before loading
                const validation = await this.validator.validatePlugin(pluginPath);

                if (!validation.isValid) {
                    console.error(`Plugin ${pluginId} failed validation:`, validation.errors);
                    continue;
                }

                // Check for high-severity security issues
                const highSeverityIssues = validation.securityIssues.filter(
                    issue => issue.severity === 'high'
                );

                if (highSeverityIssues.length > 0) {
                    console.error(
                        `Plugin ${pluginId} has high-severity security issues:`,
                        highSeverityIssues
                    );
                    continue;
                }

                // Create secure sandbox for plugin
                const secureAPI = await this.securityManager.createSandbox(pluginId, pluginPath);

                // Load backend with secure API
                const backendScriptPath = path.join(pluginPath, 'backend.js');

                try {
                    await fs.access(backendScriptPath);

                    // Clear module cache if needed
                    const settingsStore = await this.mainApp.getStore();
                    if (settingsStore && settingsStore.get('clearPluginCache', false)) {
                        delete require.cache[require.resolve(backendScriptPath)];
                    }

                    const pluginModule = require(backendScriptPath);

                    if (pluginModule && typeof pluginModule.initialize === 'function') {
                        // Initialize with secure API instead of original API
                        pluginModule.initialize(secureAPI);
                        loadedPluginBackends.set(pluginId, secureAPI);

                        console.log(`Securely loaded backend for: ${pluginId}`);
                    }
                } catch (e) {
                    if (e.code !== 'ENOENT') {
                        console.error(`Error loading secure backend for plugin ${pluginId}:`, e);
                    }
                }
            } catch (error) {
                console.error(`Failed to securely load plugin ${pluginId}:`, error);
            }
        }

        return loadedPluginBackends;
    }

    /**
     * Handle security violations
     */
    handleSecurityViolation(event) {
        const { pluginId, type, data } = event;

        switch (type) {
            case 'resourceLimit':
                this.handleResourceViolation(pluginId, data);
                break;
            case 'unauthorizedAPI':
                this.handleAPIViolation(pluginId, data);
                break;
            case 'maliciousActivity':
                this.handleMaliciousActivity(pluginId, data);
                break;
            default:
                console.warn(`Unknown security violation type: ${type}`);
        }
    }

    /**
     * Handle resource limit violations
     */
    handleResourceViolation(pluginId, data) {
        console.warn(`Resource violation by ${pluginId}:`, data);

        // Log the violation
        this.logSecurityEvent('resource_violation', { pluginId, data });

        // Notify user
        if (this.mainApp.webContents) {
            this.mainApp.webContents.send('plugin-resource-violation', {
                pluginId,
                type: data.type,
                message: `Plugin "${pluginId}" exceeded ${data.type} limit`,
            });
        }
    }

    /**
     * Handle API access violations
     */
    handleAPIViolation(pluginId, data) {
        console.warn(`API violation by ${pluginId}:`, data);

        // Log the violation
        this.logSecurityEvent('api_violation', { pluginId, data });

        // Consider blocking plugin after repeated violations
        // This could be implemented with a violation counter
    }

    /**
     * Handle malicious activity
     */
    handleMaliciousActivity(pluginId, data) {
        console.error(`Malicious activity detected in ${pluginId}:`, data);

        // Log the violation
        this.logSecurityEvent('malicious_activity', { pluginId, data });

        // Block plugin immediately
        this.securityManager.blockPlugin(pluginId);

        // Notify user
        if (this.mainApp.webContents) {
            this.mainApp.webContents.send('plugin-blocked', {
                pluginId,
                reason: 'Malicious activity detected',
                data,
            });
        }
    }

    /**
     * Log security events
     */
    async logSecurityEvent(eventType, data) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            eventType,
            data,
        };

        try {
            const logPath = path.join(__dirname, '..', 'logs', 'security.log');
            await fs.mkdir(path.dirname(logPath), { recursive: true });
            await fs.appendFile(logPath, JSON.stringify(logEntry) + '\n');
        } catch (error) {
            console.error('Failed to log security event:', error);
        }
    }

    /**
     * Get security status for UI
     */
    getSecurityStatus() {
        return this.securityManager.getSecurityStatus();
    }

    /**
     * Validate plugin manually
     */
    async validatePlugin(pluginPath) {
        return await this.validator.validatePlugin(pluginPath);
    }

    /**
     * Trust a plugin
     */
    trustPlugin(pluginId) {
        this.securityManager.trustPlugin(pluginId);
    }

    /**
     * Block a plugin
     */
    blockPlugin(pluginId) {
        this.securityManager.blockPlugin(pluginId);
    }

    /**
     * Get plugin sandbox
     */
    getPluginSandbox(pluginId) {
        return this.securityManager.sandboxes.get(pluginId);
    }

    /**
     * Cleanup security integration
     */
    async cleanup() {
        if (this.securityManager) {
            await this.securityManager.cleanup();
        }
    }
}

module.exports = SecurityIntegration;
