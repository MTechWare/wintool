/**
 * Batch Checker Utility
 * Consolidates multiple registry and service checks into single PowerShell executions
 * to reduce process spawning during tab loading
 */

class BatchChecker {
    constructor() {
        this.registryChecks = [];
        this.serviceChecks = [];
        this.results = new Map();
    }

    /**
     * Add a registry check to the batch
     * @param {string} key - Unique identifier for this check
     * @param {string} path - Registry path
     * @param {string} name - Registry value name
     * @param {string} expectedValue - Expected value pattern
     */
    addRegistryCheck(key, path, name, expectedValue) {
        this.registryChecks.push({
            key,
            path,
            name,
            expectedValue
        });
    }

    /**
     * Add a service check to the batch
     * @param {string} serviceName - Name of the service to check
     */
    addServiceCheck(serviceName) {
        this.serviceChecks.push(serviceName);
    }

    /**
     * Execute all batched registry checks in a single PowerShell call
     * @returns {Promise<Object>} Results object with check results
     */
    async executeRegistryChecks() {
        if (this.registryChecks.length === 0) {
            return {};
        }

        try {
            const data = {
                checks: this.registryChecks
            };

            const results = await window.electronAPI.executeBatchPowerShell('batch-registry-check', data);
            
            // Store results for later retrieval
            for (const [key, result] of Object.entries(results)) {
                this.results.set(key, result);
            }

            return results;
        } catch (error) {
            console.error('Batch registry check failed:', error);
            // Return empty results on failure
            const emptyResults = {};
            this.registryChecks.forEach(check => {
                emptyResults[check.key] = { found: false, matches: false, output: null };
                this.results.set(check.key, emptyResults[check.key]);
            });
            return emptyResults;
        }
    }

    /**
     * Execute all batched service checks in a single PowerShell call
     * @returns {Promise<Object>} Results object with service statuses
     */
    async executeServiceChecks() {
        if (this.serviceChecks.length === 0) {
            return {};
        }

        try {
            const data = {
                services: this.serviceChecks
            };

            const results = await window.electronAPI.executeBatchPowerShell('batch-service-check', data);
            
            // Store results for later retrieval
            for (const [serviceName, result] of Object.entries(results)) {
                this.results.set(`service_${serviceName}`, result);
            }

            return results;
        } catch (error) {
            console.error('Batch service check failed:', error);
            // Return empty results on failure
            const emptyResults = {};
            this.serviceChecks.forEach(serviceName => {
                emptyResults[serviceName] = { Name: serviceName, Status: 'Error', StartType: 'Error' };
                this.results.set(`service_${serviceName}`, emptyResults[serviceName]);
            });
            return emptyResults;
        }
    }

    /**
     * Execute all batched checks (both registry and service)
     * @returns {Promise<Object>} Combined results object
     */
    async executeAllChecks() {
        const [registryResults, serviceResults] = await Promise.all([
            this.executeRegistryChecks(),
            this.executeServiceChecks()
        ]);

        return {
            registry: registryResults,
            services: serviceResults
        };
    }

    /**
     * Get the result of a specific check
     * @param {string} key - The key used when adding the check
     * @returns {Object|null} The check result or null if not found
     */
    getResult(key) {
        return this.results.get(key) || null;
    }

    /**
     * Check if a registry check matches the expected value
     * @param {string} key - The key used when adding the check
     * @returns {boolean} True if the check matches the expected value
     */
    isRegistryCheckMatched(key) {
        const result = this.getResult(key);
        return result ? result.matches : false;
    }

    /**
     * Check if a service is in a specific state
     * @param {string} serviceName - Name of the service
     * @param {string} expectedStatus - Expected status (e.g., 'Disabled', 'Running')
     * @returns {boolean} True if the service matches the expected status
     */
    isServiceInState(serviceName, expectedStatus) {
        const result = this.getResult(`service_${serviceName}`);
        return result ? result.StartType === expectedStatus || result.Status === expectedStatus : false;
    }

    /**
     * Clear all batched checks and results
     */
    clear() {
        this.registryChecks = [];
        this.serviceChecks = [];
        this.results.clear();
    }

    /**
     * Create a batch checker for tweaks tab
     * Pre-configured with common tweak checks
     * @returns {BatchChecker} Configured batch checker
     */
    static createTweaksBatchChecker() {
        const checker = new BatchChecker();
        
        // Add common registry checks for tweaks
        checker.addRegistryCheck(
            'activity-history',
            'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System',
            'EnableActivityFeed',
            'EnableActivityFeed    REG_DWORD    0x0'
        );
        
        checker.addRegistryCheck(
            'cortana',
            'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search',
            'AllowCortana',
            'AllowCortana    REG_DWORD    0x0'
        );
        
        checker.addRegistryCheck(
            'consumer-features',
            'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent',
            'DisableWindowsConsumerFeatures',
            'DisableWindowsConsumerFeatures    REG_DWORD    0x1'
        );
        
        checker.addRegistryCheck(
            'location-tracking',
            'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location',
            'Value',
            'Value    REG_SZ    Deny'
        );
        
        checker.addRegistryCheck(
            'hibernation',
            'HKLM\\System\\CurrentControlSet\\Control\\Session Manager\\Power',
            'HibernateEnabled',
            'HibernateEnabled    REG_DWORD    0x0'
        );
        
        // Add service checks
        checker.addServiceCheck('DiagTrack');
        checker.addServiceCheck('dmwappushservice');
        checker.addServiceCheck('WerSvc');
        checker.addServiceCheck('Spooler');
        checker.addServiceCheck('WSearch');
        
        return checker;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BatchChecker;
} else {
    window.BatchChecker = BatchChecker;
}
