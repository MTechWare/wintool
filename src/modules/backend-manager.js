/**
 * Backend Manager - Central Coordinator for All Backend Modules
 * 
 * This module serves as the central hub for managing all backend services,
 * providing dependency injection, lifecycle management, and error handling.
 * 
 * Features:
 * - Service registration and discovery
 * - Dependency injection
 * - Lifecycle management (initialize, start, stop, cleanup)
 * - Health monitoring
 * - Event-driven communication
 * - Performance monitoring
 * - Error handling and recovery
 */

const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;

class BackendManager extends EventEmitter {
    constructor() {
        super();
        
        // Core properties
        this.services = new Map();
        this.serviceInstances = new Map();
        this.serviceStates = new Map();
        this.dependencies = new Map();
        this.healthChecks = new Map();
        this.metrics = new Map();
        
        // State management
        this.isInitialized = false;
        this.isStarted = false;
        this.startupOrder = [];
        this.shutdownOrder = [];
        
        // Configuration
        this.config = {
            healthCheckInterval: 30000, // 30 seconds
            maxRetries: 3,
            retryDelay: 1000,
            enableMetrics: true,
            enableHealthChecks: true
        };
        
        // Bind methods
        this.registerService = this.registerService.bind(this);
        this.getService = this.getService.bind(this);
        this.initialize = this.initialize.bind(this);
        this.start = this.start.bind(this);
        this.stop = this.stop.bind(this);
        this.cleanup = this.cleanup.bind(this);
        
        // Setup error handling
        this.setupErrorHandling();
        
        // Start health monitoring if enabled
        if (this.config.enableHealthChecks) {
            this.startHealthMonitoring();
        }
    }
    
    /**
     * Register a service with the backend manager
     */
    registerService(name, serviceClass, options = {}) {
        if (this.services.has(name)) {
            throw new Error(`Service '${name}' is already registered`);
        }
        
        const serviceConfig = {
            name,
            class: serviceClass,
            dependencies: options.dependencies || [],
            priority: options.priority || 0,
            healthCheck: options.healthCheck || null,
            autoStart: options.autoStart !== false,
            singleton: options.singleton !== false,
            retryOnFailure: options.retryOnFailure !== false,
            ...options
        };
        
        this.services.set(name, serviceConfig);
        this.serviceStates.set(name, 'registered');
        
        // Initialize metrics for this service
        if (this.config.enableMetrics) {
            this.metrics.set(name, {
                startTime: null,
                restarts: 0,
                errors: 0,
                lastError: null,
                healthCheckFailures: 0
            });
        }
        
        this.emit('service-registered', { name, config: serviceConfig });
        console.log(`[BackendManager] Service '${name}' registered`);
        
        return this;
    }
    
    /**
     * Get a service instance
     */
    getService(name) {
        if (!this.serviceInstances.has(name)) {
            throw new Error(`Service '${name}' is not available`);
        }
        
        return this.serviceInstances.get(name);
    }
    
    /**
     * Check if a service is available
     */
    hasService(name) {
        return this.serviceInstances.has(name);
    }
    
    /**
     * Get service state
     */
    getServiceState(name) {
        return this.serviceStates.get(name) || 'unknown';
    }
    
    /**
     * Get all service states
     */
    getAllServiceStates() {
        const states = {};
        for (const [name, state] of this.serviceStates) {
            states[name] = {
                state,
                metrics: this.metrics.get(name) || null
            };
        }
        return states;
    }
    
    /**
     * Setup error handling
     */
    setupErrorHandling() {
        this.on('error', (error) => {
            console.error('[BackendManager] Error:', error);
        });
        
        this.on('service-error', ({ serviceName, error }) => {
            console.error(`[BackendManager] Service '${serviceName}' error:`, error);
            
            // Update metrics
            if (this.config.enableMetrics && this.metrics.has(serviceName)) {
                const metrics = this.metrics.get(serviceName);
                metrics.errors++;
                metrics.lastError = {
                    message: error.message,
                    timestamp: new Date().toISOString()
                };
            }
            
            // Attempt recovery if enabled
            const serviceConfig = this.services.get(serviceName);
            if (serviceConfig && serviceConfig.retryOnFailure) {
                this.retryService(serviceName);
            }
        });
    }
    
    /**
     * Start health monitoring
     */
    startHealthMonitoring() {
        this.healthCheckTimer = setInterval(() => {
            this.performHealthChecks();
        }, this.config.healthCheckInterval);
    }
    
    /**
     * Stop health monitoring
     */
    stopHealthMonitoring() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
    }
    
    /**
     * Perform health checks on all services
     */
    async performHealthChecks() {
        for (const [serviceName, serviceConfig] of this.services) {
            if (serviceConfig.healthCheck && this.serviceInstances.has(serviceName)) {
                try {
                    const instance = this.serviceInstances.get(serviceName);
                    const isHealthy = await serviceConfig.healthCheck(instance);
                    
                    if (!isHealthy) {
                        this.emit('service-unhealthy', { serviceName });
                        
                        // Update metrics
                        if (this.config.enableMetrics && this.metrics.has(serviceName)) {
                            this.metrics.get(serviceName).healthCheckFailures++;
                        }
                    }
                } catch (error) {
                    this.emit('service-error', { serviceName, error });
                }
            }
        }
    }
    
    /**
     * Retry a failed service
     */
    async retryService(serviceName, attempt = 1) {
        if (attempt > this.config.maxRetries) {
            console.error(`[BackendManager] Service '${serviceName}' failed after ${this.config.maxRetries} retries`);
            this.serviceStates.set(serviceName, 'failed');
            return;
        }
        
        console.log(`[BackendManager] Retrying service '${serviceName}' (attempt ${attempt})`);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
        
        try {
            await this.startService(serviceName);
            
            // Update metrics
            if (this.config.enableMetrics && this.metrics.has(serviceName)) {
                this.metrics.get(serviceName).restarts++;
            }
        } catch (error) {
            this.emit('service-error', { serviceName, error });
            await this.retryService(serviceName, attempt + 1);
        }
    }
}

module.exports = BackendManager;
