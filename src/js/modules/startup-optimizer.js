/**
 * Startup Performance Optimizer
 * 
 * This module applies aggressive performance optimizations during startup
 * to reduce the 20-second startup time to under 10 seconds.
 */

export class StartupOptimizer {
    constructor() {
        this.optimizations = new Map();
        this.applied = false;
    }

    /**
     * Apply startup optimizations based on system capabilities
     */
    async applyStartupOptimizations() {
        if (this.applied) return;
        
        const startTime = performance.now();
        console.log('🚀 Applying startup performance optimizations...');

        try {
            // Get system information for optimization decisions
            const systemInfo = await this.getSystemCapabilities();
            
            // Apply optimizations based on system type
            await this.applySystemSpecificOptimizations(systemInfo);
            
            // Apply general startup optimizations
            await this.applyGeneralOptimizations();
            
            this.applied = true;
            console.log(`✅ Startup optimizations applied in ${(performance.now() - startTime).toFixed(2)}ms`);
            
        } catch (error) {
            console.error('❌ Error applying startup optimizations:', error);
        }
    }

    /**
     * Get system capabilities for optimization decisions
     */
    async getSystemCapabilities() {
        try {
            if (window.electronAPI && window.electronAPI.getSystemInfo) {
                const systemInfo = await window.electronAPI.getSystemInfo();
                const memoryGB = systemInfo.totalMemory ? 
                    Math.round(parseInt(systemInfo.totalMemory.replace(/[^\d]/g, '')) / 1024 / 1024 / 1024) : 4;
                const cpuCores = systemInfo.cpuCores || 4;
                
                return {
                    memoryGB,
                    cpuCores,
                    isLowEnd: memoryGB < 4 || cpuCores < 4,
                    isHighEnd: memoryGB >= 8 && cpuCores >= 8
                };
            }
        } catch (error) {
            console.warn('Could not get system info, using conservative defaults');
        }
        
        // Default to mid-range system
        return {
            memoryGB: 8,
            cpuCores: 4,
            isLowEnd: false,
            isHighEnd: false
        };
    }

    /**
     * Apply system-specific optimizations based on user preference or system detection
     */
    async applySystemSpecificOptimizations(systemInfo) {
        // First check if user has set a specific performance mode
        let userPerformanceMode = 'balanced';
        try {
            if (window.electronAPI) {
                userPerformanceMode = await window.electronAPI.getSetting('performanceMode', 'balanced');
                console.log('🎯 User performance mode preference:', userPerformanceMode);
            }
        } catch (error) {
            console.warn('Could not get user performance mode, using balanced mode');
        }

        // Apply optimizations based on user preference
        if (userPerformanceMode === 'low-end') {
            console.log('🔧 Applying low-end optimizations (user preference)...');
            await this.applyLowEndOptimizations();
        } else if (userPerformanceMode === 'high-end') {
            console.log('🚀 Applying high-end optimizations (user preference)...');
            await this.applyHighEndOptimizations();
        } else if (userPerformanceMode === 'balanced') {
            console.log('⚖️ Applying balanced optimizations (user preference)...');
            await this.applyBalancedOptimizations();
        } else {
            // Fallback to balanced if unknown mode
            console.log('⚖️ Applying balanced system optimizations (fallback)...');
            await this.applyBalancedOptimizations();
        }
    }

    /**
     * Apply optimizations for low-end systems
     */
    async applyLowEndOptimizations() {
        const optimizations = {
            fastSystemInfo: true,
            cacheSystemInfo: true,
            enableDiscordRpc: false,
            enableLazyLoading: true, // Enable lazy loading for better performance on low-end systems
            sequentialLoadDelay: 15,
            performanceMode: 'low-end',
            disableAnimations: true
        };

        await this.applySettings(optimizations);
        this.optimizations.set('lowEnd', optimizations);
    }

    /**
     * Apply optimizations for high-end systems
     */
    async applyHighEndOptimizations() {
        const optimizations = {
            fastSystemInfo: false, // Can handle full system info
            cacheSystemInfo: false, // Disable caching for real-time data on high-end systems
            enableDiscordRpc: true,
            enableLazyLoading: false, // Disable lazy loading for instant access on high-end systems
            sequentialLoadDelay: 2,
            performanceMode: 'high-end',
            disableAnimations: true
        };

        await this.applySettings(optimizations);
        this.optimizations.set('highEnd', optimizations);
    }

    /**
     * Apply balanced optimizations for mid-range systems
     */
    async applyBalancedOptimizations() {
        const optimizations = {
            fastSystemInfo: true, // Use fast mode for startup
            cacheSystemInfo: true,
            enableDiscordRpc: true,
            enableLazyLoading: true, // Enable lazy loading for balanced approach
            sequentialLoadDelay: 5,
            performanceMode: 'balanced', // Save the detected balanced mode instead of keeping 'auto'
            disableAnimations: true
        };

        await this.applySettings(optimizations);
        this.optimizations.set('balanced', optimizations);
    }

    /**
     * Apply general startup optimizations regardless of system
     */
    async applyGeneralOptimizations() {
        const generalOptimizations = {
            // Reduce timeouts for faster startup
            tabInitTimeout: 4000,
            systemInfoTimeout: 10000,
            
            // Enable aggressive caching
            enableStartupCache: true,
            
            // Optimize plugin loading
            pluginBatchSize: 5,
            pluginBatchDelay: 50
        };

        await this.applySettings(generalOptimizations);
        this.optimizations.set('general', generalOptimizations);
    }

    /**
     * Apply settings to the application only if they haven't been customized by the user
     */
    async applySettings(settings) {
        if (!window.electronAPI) return;

        // Check if user has a custom performance mode or has manually configured settings
        const hasCustomSettings = await this.checkForUserCustomizations();
        
        if (hasCustomSettings) {
            console.log('🎯 User has custom performance settings - skipping automatic optimizations');
            return;
        }

        for (const [key, value] of Object.entries(settings)) {
            try {
                // Only apply non-performance settings or if this is the first run
                if (!this.isPerformanceSetting(key) || await this.isFirstRun()) {
                    await window.electronAPI.setSetting(key, value);
                    console.log(`⚙️ Applied setting: ${key} = ${value}`);
                }
            } catch (error) {
                console.warn(`⚠️ Failed to apply setting ${key}:`, error);
            }
        }
    }

    /**
     * Check if user has customized performance settings
     */
    async checkForUserCustomizations() {
        try {
            // Check if user has explicitly set performance mode to something other than default
            const performanceMode = await window.electronAPI.getSetting('performanceMode', 'balanced');
            
            // Check if user has a flag indicating they've customized settings
            const hasCustomizedSettings = await window.electronAPI.getSetting('hasCustomizedPerformanceSettings', false);
            
            return hasCustomizedSettings;
        } catch (error) {
            console.warn('Could not check for user customizations:', error);
            return false;
        }
    }

    /**
     * Check if this is the first run of the application
     */
    async isFirstRun() {
        try {
            const hasRunBefore = await window.electronAPI.getSetting('hasRunBefore', false);
            if (!hasRunBefore) {
                await window.electronAPI.setSetting('hasRunBefore', true);
                return true;
            }
            return false;
        } catch (error) {
            console.warn('Could not check first run status:', error);
            return false;
        }
    }

    /**
     * Check if a setting key is related to performance
     */
    isPerformanceSetting(key) {
        const performanceSettings = [
            'fastSystemInfo',
            'cacheSystemInfo', 
            'enableDiscordRpc',
            'enableLazyLoading',
            'disableAnimations'
        ];
        return performanceSettings.includes(key);
    }

    /**
     * Get applied optimizations for debugging
     */
    getAppliedOptimizations() {
        return Object.fromEntries(this.optimizations);
    }

    /**
     * Reset optimizations (for testing)
     */
    async resetOptimizations() {
        this.applied = false;
        this.optimizations.clear();
        console.log('🔄 Startup optimizations reset');
    }
}

// Global instance
export const startupOptimizer = new StartupOptimizer();

/**
 * Initialize startup optimizer
 */
export async function initStartupOptimizer() {
    await startupOptimizer.applyStartupOptimizations();
}

/**
 * Get startup performance recommendations
 */
export function getStartupRecommendations(startupTime) {
    const recommendations = [];

    if (startupTime > 20000) {
        recommendations.push({
            type: 'critical',
            message: 'Startup time is very slow. Consider enabling low-end mode.',
            action: 'enableLowEndMode'
        });
    } else if (startupTime > 15000) {
        recommendations.push({
            type: 'warning',
            message: 'Startup time could be improved. Consider optimizing settings.',
            action: 'optimizeSettings'
        });
    } else if (startupTime > 10000) {
        recommendations.push({
            type: 'info',
            message: 'Startup time is acceptable but could be faster.',
            action: 'minorOptimizations'
        });
    }

    return recommendations;
}
