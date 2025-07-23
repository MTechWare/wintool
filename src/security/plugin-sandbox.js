/**
 * Enhanced Plugin Sandbox System
 * Provides improved security boundaries and resource management for WinTool plugins
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { EventEmitter } = require('events');

class PluginSandbox extends EventEmitter {
  constructor(pluginId, pluginPath, config = {}) {
    super();
    this.pluginId = pluginId;
    this.pluginPath = pluginPath;
    this.config = {
      maxMemoryUsage: config.maxMemoryUsage || 100 * 1024 * 1024, // 100MB
      maxExecutionTime: config.maxExecutionTime || 30000, // 30 seconds
      allowedDomains: config.allowedDomains || [],
      restrictedAPIs: config.restrictedAPIs || ['require', 'process', 'fs', 'child_process', 'os', 'cluster'],
      allowedAPIs: config.allowedAPIs || [
        'wintoolAPI.store',
        'wintoolAPI.tabs',
        'wintoolAPI.invoke',
        'wintoolAPI.notifications',
      ],
      cspPolicy:
        config.cspPolicy || "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
      ...config,
    };

    this.resourceUsage = {
      memory: 0,
      executionTime: 0,
      apiCalls: 0,
      networkRequests: 0,
    };

    this.permissions = new Set();
    this.apiCallLog = [];
    this.isActive = false;
    this.startTime = null;
  }

  /**
   * Initialize the sandbox for a plugin
   */
  async initialize() {
    console.log(`Initializing sandbox for plugin: ${this.pluginId}`);

    // Load plugin permissions
    await this.loadPermissions();

    // Set up resource monitoring
    this.setupResourceMonitoring();

    // Create secure API wrapper
    this.secureAPI = this.createSecureAPI();

    this.isActive = true;
    this.startTime = Date.now();

    this.emit('initialized', this.pluginId);
    return this.secureAPI;
  }

  /**
   * Load plugin permissions from manifest
   */
  async loadPermissions() {
    try {
      const manifestPath = path.join(this.pluginPath, 'plugin.json');
      const manifestContent = await fs.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestContent);

      // Load permissions from manifest
      if (manifest.permissions) {
        manifest.permissions.forEach(permission => {
          this.permissions.add(permission);
        });
      }

      // Default permissions for all plugins
      this.permissions.add('storage.read');
      this.permissions.add('storage.write');
      this.permissions.add('notifications.show');
    } catch (error) {
      console.warn(`Failed to load permissions for ${this.pluginId}:`, error.message);
    }
  }

  /**
   * Set up resource monitoring
   */
  setupResourceMonitoring() {
    // Monitor memory usage
    this.memoryMonitor = setInterval(() => {
      const usage = process.memoryUsage();
      this.resourceUsage.memory = usage.heapUsed;

      if (this.resourceUsage.memory > this.config.maxMemoryUsage) {
        this.emit('resourceLimitExceeded', {
          type: 'memory',
          current: this.resourceUsage.memory,
          limit: this.config.maxMemoryUsage,
        });
      }
    }, 1000);

    // Monitor execution time
    this.executionMonitor = setInterval(() => {
      if (this.startTime) {
        this.resourceUsage.executionTime = Date.now() - this.startTime;

        if (this.resourceUsage.executionTime > this.config.maxExecutionTime) {
          this.emit('resourceLimitExceeded', {
            type: 'executionTime',
            current: this.resourceUsage.executionTime,
            limit: this.config.maxExecutionTime,
          });
        }
      }
    }, 5000);
  }

  /**
   * Create secure API wrapper with permission checks
   */
  createSecureAPI() {
    const sandbox = this;

    return {
      // Secure storage API
      storage: {
        async get(key) {
          if (!sandbox.checkPermission('storage.read')) {
            throw new Error('Permission denied: storage.read');
          }

          sandbox.logAPICall('storage.get', { key });
          const store = await sandbox.getStore();
          return store.get(`${sandbox.pluginId}_${key}`);
        },

        async set(key, value) {
          if (!sandbox.checkPermission('storage.write')) {
            throw new Error('Permission denied: storage.write');
          }

          sandbox.logAPICall('storage.set', { key, valueType: typeof value });
          const store = await sandbox.getStore();
          return store.set(`${sandbox.pluginId}_${key}`, value);
        },

        async delete(key) {
          if (!sandbox.checkPermission('storage.write')) {
            throw new Error('Permission denied: storage.write');
          }

          sandbox.logAPICall('storage.delete', { key });
          const store = await sandbox.getStore();
          return store.delete(`${sandbox.pluginId}_${key}`);
        },
      },

      // Secure HTTP API
      http: {
        async request(url, options = {}) {
          if (!sandbox.checkPermission('network.request')) {
            throw new Error('Permission denied: network.request');
          }

          if (!sandbox.isAllowedDomain(url)) {
            throw new Error(`Domain not allowed: ${new URL(url).hostname}`);
          }

          sandbox.logAPICall('http.request', { url, method: options.method || 'GET' });
          sandbox.resourceUsage.networkRequests++;

          // Use the existing axios instance with additional security
          const axios = require('axios');
          return await axios({
            url,
            timeout: 10000, // 10 second timeout
            maxRedirects: 3,
            ...options,
          });
        },
      },

      // Secure notifications API
      notifications: {
        show(message, type = 'info') {
          if (!sandbox.checkPermission('notifications.show')) {
            throw new Error('Permission denied: notifications.show');
          }

          sandbox.logAPICall('notifications.show', { type, messageLength: message.length });

          // Sanitize message
          const sanitizedMessage = sandbox.sanitizeString(message);

          // Call the original notification system
          if (global.showNotification) {
            global.showNotification(sanitizedMessage, type);
          }
        },
      },

      // Secure file system API (limited)
      fs: {
        async readUserFile() {
          if (!sandbox.checkPermission('fs.readUserFile')) {
            throw new Error('Permission denied: fs.readUserFile');
          }

          // This would open a file dialog for user to select a file
          sandbox.logAPICall('fs.readUserFile');

          // Implementation would use Electron's dialog API
          const { dialog } = require('electron');
          const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
              { name: 'Text Files', extensions: ['txt', 'json', 'csv'] },
              { name: 'All Files', extensions: ['*'] },
            ],
          });

          if (!result.canceled && result.filePaths.length > 0) {
            const filePath = result.filePaths[0];
            return await fs.readFile(filePath, 'utf8');
          }

          return null;
        },
      },

      // Utility functions
      utils: {
        sanitize: input => sandbox.sanitizeString(input),
        hash: input => sandbox.hashString(input),
        validateInput: (input, rules) => sandbox.validateInput(input, rules),
      },
    };
  }

  /**
   * Check if plugin has specific permission
   */
  checkPermission(permission) {
    return this.permissions.has(permission);
  }

  /**
   * Check if domain is allowed for network requests
   */
  isAllowedDomain(url) {
    if (this.config.allowedDomains.length === 0) {
      return true; // No restrictions
    }

    try {
      const hostname = new URL(url).hostname;
      return this.config.allowedDomains.some(domain => {
        return hostname === domain || hostname.endsWith('.' + domain);
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * Log API calls for monitoring
   */
  logAPICall(method, params = {}) {
    const logEntry = {
      timestamp: Date.now(),
      method,
      params,
      pluginId: this.pluginId,
    };

    this.apiCallLog.push(logEntry);
    this.resourceUsage.apiCalls++;

    // Keep only last 100 calls
    if (this.apiCallLog.length > 100) {
      this.apiCallLog.shift();
    }

    this.emit('apiCall', logEntry);
  }

  /**
   * Sanitize string input
   */
  sanitizeString(input) {
    if (typeof input !== 'string') {
      return String(input);
    }

    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  /**
   * Hash string for security
   */
  hashString(input) {
    return crypto.createHash('sha256').update(String(input)).digest('hex');
  }

  /**
   * Validate input against rules
   */
  validateInput(input, rules) {
    const errors = [];

    if (rules.required && (!input || input.trim() === '')) {
      errors.push('Input is required');
    }

    if (rules.minLength && input.length < rules.minLength) {
      errors.push(`Input must be at least ${rules.minLength} characters`);
    }

    if (rules.maxLength && input.length > rules.maxLength) {
      errors.push(`Input must be no more than ${rules.maxLength} characters`);
    }

    if (rules.pattern && !rules.pattern.test(input)) {
      errors.push('Input format is invalid');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get store instance (placeholder - would use actual store)
   */
  async getStore() {
    // This would return the actual electron-store instance
    // For now, return a mock
    return {
      get: key => global.pluginStore?.get(key),
      set: (key, value) => global.pluginStore?.set(key, value),
      delete: key => global.pluginStore?.delete(key),
    };
  }

  /**
   * Cleanup sandbox resources
   */
  destroy() {
    console.log(`Destroying sandbox for plugin: ${this.pluginId}`);

    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
    }

    if (this.executionMonitor) {
      clearInterval(this.executionMonitor);
    }

    this.isActive = false;
    this.emit('destroyed', this.pluginId);
  }

  /**
   * Get current resource usage
   */
  getResourceUsage() {
    return { ...this.resourceUsage };
  }

  /**
   * Get API call log
   */
  getAPICallLog() {
    return [...this.apiCallLog];
  }
}

module.exports = PluginSandbox;
