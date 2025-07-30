/**
 * Plugin Security Manager
 * Manages security policies, sandboxes, and monitoring for all plugins
 */

const PluginSandbox = require('./plugin-sandbox');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { EventEmitter } = require('events');

class PluginSecurityManager extends EventEmitter {
    constructor() {
        super();
        this.sandboxes = new Map();
        this.securityPolicies = new Map();
        this.trustedPlugins = new Set();
        this.blockedPlugins = new Set();
        this.resourceLimits = {
            global: {
                maxPlugins: 50,
                maxTotalMemory: 500 * 1024 * 1024, // 500MB
                maxConcurrentNetworkRequests: 10,
            },
        };
        this.currentResourceUsage = {
            totalMemory: 0,
            activePlugins: 0,
            networkRequests: 0,
        };

        this.setupGlobalMonitoring();
    }

    /**
     * Initialize security manager
     */
    async initialize() {
        // Load security policies
        await this.loadSecurityPolicies();

        // Load trusted/blocked plugin lists
        await this.loadPluginLists();
    }

    /**
     * Create and initialize sandbox for a plugin
     */
    async createSandbox(pluginId, pluginPath, customConfig = {}) {
        if (this.blockedPlugins.has(pluginId)) {
            throw new Error(`Plugin ${pluginId} is blocked for security reasons`);
        }

        if (this.sandboxes.has(pluginId)) {
            await this.destroySandbox(pluginId);
        }

        // Check global resource limits
        if (this.currentResourceUsage.activePlugins >= this.resourceLimits.global.maxPlugins) {
            throw new Error('Maximum number of active plugins reached');
        }

        // Get security policy for plugin
        const policy = this.getSecurityPolicy(pluginId);
        const config = { ...policy, ...customConfig };

        // Create sandbox
        const sandbox = new PluginSandbox(pluginId, pluginPath, config);

        // Set up event listeners
        this.setupSandboxEventListeners(sandbox);

        // Initialize sandbox
        const secureAPI = await sandbox.initialize();

        // Store sandbox
        this.sandboxes.set(pluginId, sandbox);
        this.currentResourceUsage.activePlugins++;

        this.emit('sandboxCreated', { pluginId, sandbox });

        return secureAPI;
    }

    /**
     * Destroy sandbox for a plugin
     */
    async destroySandbox(pluginId) {
        const sandbox = this.sandboxes.get(pluginId);
        if (sandbox) {
            sandbox.destroy();
            this.sandboxes.delete(pluginId);
            this.currentResourceUsage.activePlugins--;

            this.emit('sandboxDestroyed', { pluginId });
        }
    }

    /**
     * Get security policy for a plugin
     */
    getSecurityPolicy(pluginId) {
        // Check if plugin has custom policy
        if (this.securityPolicies.has(pluginId)) {
            return this.securityPolicies.get(pluginId);
        }

        // Check if plugin is trusted
        if (this.trustedPlugins.has(pluginId)) {
            return this.getTrustedPluginPolicy();
        }

        // Return default policy
        return this.getDefaultPolicy();
    }

    /**
     * Get default security policy
     */
    getDefaultPolicy() {
        return {
            maxMemoryUsage: 50 * 1024 * 1024, // 50MB
            maxExecutionTime: 30000, // 30 seconds
            allowedDomains: [],
            restrictedAPIs: [
                'require',
                'process',
                'fs',
                'child_process',
                'os',
                'cluster',
                'vm',
                'eval',
                'Function',
            ],
            allowedAPIs: [
                'wintoolAPI.store',
                'wintoolAPI.tabs',
                'wintoolAPI.invoke',
                'wintoolAPI.notifications',
            ],
            permissions: ['storage.read', 'storage.write', 'notifications.show'],
            cspPolicy: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';",
        };
    }

    /**
     * Get trusted plugin policy (more permissive)
     */
    getTrustedPluginPolicy() {
        return {
            maxMemoryUsage: 100 * 1024 * 1024, // 100MB
            maxExecutionTime: 60000, // 60 seconds
            allowedDomains: ['*'], // All domains allowed
            restrictedAPIs: ['require', 'process', 'child_process', 'cluster'],
            allowedAPIs: [
                'wintoolAPI.store',
                'wintoolAPI.tabs',
                'wintoolAPI.invoke',
                'wintoolAPI.notifications',
                'wintoolAPI.fs',
                'wintoolAPI.http',
            ],
            permissions: [
                'storage.read',
                'storage.write',
                'notifications.show',
                'network.request',
                'fs.readUserFile',
            ],
            cspPolicy:
                "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
        };
    }

    /**
     * Set up event listeners for sandbox
     */
    setupSandboxEventListeners(sandbox) {
        sandbox.on('resourceLimitExceeded', data => {
            this.emit('securityViolation', {
                pluginId: sandbox.pluginId,
                type: 'resourceLimit',
                data,
            });

            // Take action based on violation
            this.handleSecurityViolation(sandbox.pluginId, 'resourceLimit', data);
        });

        sandbox.on('apiCall', logEntry => {
            // Monitor API usage patterns
            this.monitorAPIUsage(logEntry);
        });

        sandbox.on('destroyed', pluginId => {
            // Sandbox destroyed
        });
    }

    /**
     * Handle security violations
     */
    handleSecurityViolation(pluginId, violationType, data) {

        switch (violationType) {
            case 'resourceLimit':
                if (data.type === 'memory' || data.type === 'executionTime') {
                    // Terminate plugin
                    this.destroySandbox(pluginId);
                    this.emit('pluginTerminated', { pluginId, reason: violationType });
                }
                break;

            case 'unauthorizedAPI':
                // Log and potentially block plugin
                this.logSecurityEvent(pluginId, violationType, data);
                break;

            case 'maliciousActivity':
                // Block plugin immediately
                this.blockPlugin(pluginId);
                this.destroySandbox(pluginId);
                break;
        }
    }

    /**
     * Monitor API usage patterns for anomalies
     */
    monitorAPIUsage(logEntry) {
        // Simple anomaly detection
        const sandbox = this.sandboxes.get(logEntry.pluginId);
        if (!sandbox) return;

        const recentCalls = sandbox.getAPICallLog().slice(-10);
        const callCounts = {};

        recentCalls.forEach(call => {
            callCounts[call.method] = (callCounts[call.method] || 0) + 1;
        });

        // Check for suspicious patterns
        Object.entries(callCounts).forEach(([method, count]) => {
            if (count > 5) {
                // More than 5 calls to same method in last 10 calls
                this.emit('suspiciousActivity', {
                    pluginId: logEntry.pluginId,
                    method,
                    count,
                    pattern: 'rapidAPICalls',
                });
            }
        });
    }

    /**
     * Block a plugin
     */
    blockPlugin(pluginId) {
        this.blockedPlugins.add(pluginId);
        this.savePluginLists();
    }

    /**
     * Trust a plugin
     */
    trustPlugin(pluginId) {
        this.trustedPlugins.add(pluginId);
        this.blockedPlugins.delete(pluginId);
        this.savePluginLists();
    }

    /**
     * Set up global resource monitoring
     */
    setupGlobalMonitoring() {
        setInterval(() => {
            this.updateGlobalResourceUsage();
            this.checkGlobalLimits();
        }, 5000);
    }

    /**
     * Update global resource usage
     */
    updateGlobalResourceUsage() {
        let totalMemory = 0;
        let networkRequests = 0;

        this.sandboxes.forEach(sandbox => {
            const usage = sandbox.getResourceUsage();
            totalMemory += usage.memory;
            networkRequests += usage.networkRequests;
        });

        this.currentResourceUsage.totalMemory = totalMemory;
        this.currentResourceUsage.networkRequests = networkRequests;
    }

    /**
     * Check global resource limits
     */
    checkGlobalLimits() {
        if (this.currentResourceUsage.totalMemory > this.resourceLimits.global.maxTotalMemory) {
            this.enforceGlobalMemoryLimit();
        }
    }

    /**
     * Enforce global memory limit by terminating plugins
     */
    enforceGlobalMemoryLimit() {
        // Sort plugins by memory usage (highest first)
        const pluginsByMemory = Array.from(this.sandboxes.entries()).sort(
            (a, b) => b[1].getResourceUsage().memory - a[1].getResourceUsage().memory
        );

        // Terminate plugins until under limit
        for (const [pluginId, sandbox] of pluginsByMemory) {
            if (
                this.currentResourceUsage.totalMemory <= this.resourceLimits.global.maxTotalMemory
            ) {
                break;
            }

            if (!this.trustedPlugins.has(pluginId)) {
                this.destroySandbox(pluginId);
            }
        }
    }

    /**
     * Load security policies from file
     */
    async loadSecurityPolicies() {
        try {
            const policiesPath = path.join(__dirname, '..', 'config', 'security-policies.json');
            const policiesContent = await fs.readFile(policiesPath, 'utf8');
            const policies = JSON.parse(policiesContent);

            Object.entries(policies).forEach(([pluginId, policy]) => {
                this.securityPolicies.set(pluginId, policy);
            });

        } catch (error) {
            // No custom security policies found, using defaults
        }
    }

    /**
     * Load trusted/blocked plugin lists
     */
    async loadPluginLists() {
        try {
            const listsPath = path.join(__dirname, '..', 'config', 'plugin-lists.json');
            const listsContent = await fs.readFile(listsPath, 'utf8');
            const lists = JSON.parse(listsContent);

            if (lists.trusted) {
                lists.trusted.forEach(pluginId => this.trustedPlugins.add(pluginId));
            }

            if (lists.blocked) {
                lists.blocked.forEach(pluginId => this.blockedPlugins.add(pluginId));
            }

        } catch (error) {
            // No plugin lists found, starting with empty lists
        }
    }

    /**
     * Save plugin lists to file
     */
    async savePluginLists() {
        try {
            const listsPath = path.join(__dirname, '..', 'config', 'plugin-lists.json');
            const lists = {
                trusted: Array.from(this.trustedPlugins),
                blocked: Array.from(this.blockedPlugins),
            };

            await fs.mkdir(path.dirname(listsPath), { recursive: true });
            await fs.writeFile(listsPath, JSON.stringify(lists, null, 2));
        } catch (error) {
            // Failed to save plugin lists
        }
    }

    /**
     * Log security event
     */
    logSecurityEvent(pluginId, eventType, data) {
        const event = {
            timestamp: Date.now(),
            pluginId,
            eventType,
            data,
        };

        this.emit('securityEvent', event);
    }

    /**
     * Get security status for all plugins
     */
    getSecurityStatus() {
        const status = {
            totalPlugins: this.sandboxes.size,
            trustedPlugins: this.trustedPlugins.size,
            blockedPlugins: this.blockedPlugins.size,
            resourceUsage: this.currentResourceUsage,
            resourceLimits: this.resourceLimits.global,
        };

        return status;
    }

    /**
     * Cleanup all sandboxes
     */
    async cleanup() {
        for (const [pluginId, sandbox] of this.sandboxes) {
            await this.destroySandbox(pluginId);
        }
    }
}

module.exports = PluginSecurityManager;
