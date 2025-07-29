/**
 * Lazy Loading Helper Utility
 * Provides standardized lazy loading support for all tabs
 */

class LazyLoadingHelper {
    constructor(tabId) {
        this.tabId = tabId;
        this.initialized = false;
        this.scriptExecuted = false;
        this.globalKey = `${tabId}ScriptExecuted`;

        // Check if script has already been executed globally
        this.scriptExecuted = window[this.globalKey] || false;
    }

    /**
     * Check if the tab should initialize (not already executed)
     */
    shouldInitialize() {
        return !this.scriptExecuted;
    }

    /**
     * Mark the script as executed to prevent duplicate execution
     */
    markScriptExecuted() {
        this.scriptExecuted = true;
        window[this.globalKey] = true;
        console.log(`Script execution marked for tab: ${this.tabId}`);
    }

    /**
     * Reset the script execution flag (for refresh functionality)
     */
    resetScriptExecution() {
        this.scriptExecuted = false;
        window[this.globalKey] = false;
        this.initialized = false;
        console.log(`Script execution reset for tab: ${this.tabId}`);
    }

    /**
     * Mark the tab as initialized
     */
    markInitialized() {
        this.initialized = true;
        console.log(`Tab marked as initialized: ${this.tabId}`);
    }

    /**
     * Check if tab is initialized
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * Signal to the tab loader that this tab is ready
     */
    markTabReady() {
        if (window.tabLoader && typeof window.tabLoader.markTabAsReady === 'function') {
            window.tabLoader.markTabAsReady(this.tabId);
            console.log(`Tab marked as ready: ${this.tabId}`);
        } else if (window.markTabAsReady && typeof window.markTabAsReady === 'function') {
            window.markTabAsReady(this.tabId);
            console.log(`Tab marked as ready via global function: ${this.tabId}`);
        } else {
            console.warn(`Cannot mark tab as ready - no tab loader available: ${this.tabId}`);
        }
    }

    /**
     * Standard initialization wrapper
     * @param {Function} initFunction - The initialization function to run
     * @param {Object} options - Options for initialization
     */
    async initialize(initFunction, options = {}) {
        const { skipIfExecuted = true, markReady = true, errorHandling = true } = options;

        // Skip if already executed and skipIfExecuted is true
        if (skipIfExecuted && this.scriptExecuted) {
            console.log(`Tab script already executed, skipping initialization: ${this.tabId}`);
            if (markReady) {
                this.markTabReady();
            }
            return false;
        }

        try {
            // Mark script as executed
            this.markScriptExecuted();

            // Run the initialization function
            console.log(`Initializing tab: ${this.tabId}`);
            await initFunction();

            // Mark as initialized
            this.markInitialized();

            // Mark tab as ready
            if (markReady) {
                this.markTabReady();
            }

            console.log(`Tab initialization completed: ${this.tabId}`);
            return true;
        } catch (error) {
            console.error(`Error initializing tab ${this.tabId}:`, error);

            if (errorHandling) {
                // Still mark as ready to prevent blocking
                if (markReady) {
                    this.markTabReady();
                }
            }

            throw error;
        }
    }

    /**
     * Create a global reset function for this tab
     */
    createGlobalResetFunction() {
        const resetFunctionName = `reset${this.tabId.charAt(0).toUpperCase() + this.tabId.slice(1)}Initialization`;

        window[resetFunctionName] = () => {
            this.resetScriptExecution();
            console.log(`${resetFunctionName} called - tab will reinitialize on next access`);
        };

        console.log(`Created global reset function: ${resetFunctionName}`);
        return resetFunctionName;
    }

    /**
     * Standard DOM ready check
     */
    static waitForDOM() {
        return new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }

    /**
     * Wait for a specific element to be available
     */
    static waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver((mutations, obs) => {
                const element = document.querySelector(selector);
                if (element) {
                    obs.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
            });

            // Timeout fallback
            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element not found within timeout: ${selector}`));
            }, timeout);
        });
    }
}

// Export for use in tab scripts
window.LazyLoadingHelper = LazyLoadingHelper;

console.log('Lazy Loading Helper utility loaded');
