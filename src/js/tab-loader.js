/**
 * WinTool - Tab Loader Module
 *
 * This module handles loading tabs from folders in the src/tabs directory.
 * Each tab folder should contain: index.html, styles.css, script.js, and config.json
 */

class TabLoader {
    constructor() {
        this.loadedTabs = new Map();
        this.styleElements = new Map();
        this.totalTabs = 0;
        this.loadedTabsCount = 0;
        this.initializedTabsCount = 0;
        this.onProgressCallback = null;
        this.onCompleteCallback = null;
        this.tabInitializationPromises = new Map();
        this.tabReadyCallbacks = new Map();
    }

    /**
     * Set progress callback function
     */
    setProgressCallback(callback) {
        this.onProgressCallback = callback;
    }

    /**
     * Set completion callback function
     */
    setCompleteCallback(callback) {
        this.onCompleteCallback = callback;
    }

    /**
     * Register a tab as ready for initialization tracking
     */
    registerTabForInitialization(tabId) {
        return new Promise((resolve) => {
            this.tabReadyCallbacks.set(tabId, resolve);
            console.log(`Registered tab for initialization tracking: ${tabId}`);
        });
    }

    /**
     * Mark a tab as fully initialized
     */
    markTabAsReady(tabId) {
        const callback = this.tabReadyCallbacks.get(tabId);
        if (callback) {
            callback();
            this.tabReadyCallbacks.delete(tabId);
            this.initializedTabsCount++;
            console.log(`Tab marked as ready: ${tabId} (${this.initializedTabsCount}/${this.totalTabs})`);

            // Update progress for initialization phase (50-100%)
            const initProgress = 50 + ((this.initializedTabsCount / this.totalTabs) * 50);
            this.updateProgress(`${tabId} ready`, initProgress);

            // Check if all tabs are initialized
            if (this.initializedTabsCount >= this.totalTabs) {
                this.updateProgress('All tabs ready!', 100);
                if (this.onCompleteCallback) {
                    setTimeout(() => this.onCompleteCallback(), 500);
                }
            }
        }
    }

    /**
     * Initialize the tab loader and load all folder-based tabs
     */
    async init(defaultOrder = []) {
        console.log('Initializing tab loader...');

        try {
            // 1. Get the combined, unsorted list of tabs and plugins
            const allItems = await window.electronAPI.getTabFolders();
            console.log('Found tabs and plugins:', allItems);

            // 2. Sort the items: built-in tabs first, then plugins, with 'about' always last.
            allItems.sort((a, b) => {
                // Rule 1: 'about' tab is always last.
                if (a.name === 'about') return 1;
                if (b.name === 'about') return -1;

                const aIsTab = a.type === 'tab';
                const bIsTab = b.type === 'tab';
                const aIndex = defaultOrder.indexOf(a.name);
                const bIndex = defaultOrder.indexOf(b.name);

                if (aIsTab && bIsTab) {
                    // Rule 2: Both are built-in tabs, sort by the default order.
                    return (aIndex > -1 ? aIndex : Infinity) - (bIndex > -1 ? bIndex : Infinity);
                }
                
                if (aIsTab) return -1; // Rule 3: Tabs always come before plugins.
                if (bIsTab) return 1;

                // Rule 4: Both are plugins, sort alphabetically.
                return a.name.localeCompare(b.name);
            });

            const sortedFolderNames = allItems.map(item => item.name);
            console.log('Sorted tab folders:', sortedFolderNames);

            this.totalTabs = sortedFolderNames.length;
            this.loadedTabsCount = 0;
            this.initializedTabsCount = 0;

            if (this.totalTabs === 0) {
                this.updateProgress('No tabs to load', 100);
                if (this.onCompleteCallback) {
                    setTimeout(() => this.onCompleteCallback(), 500);
                }
                return;
            }

            this.updateProgress('Loading tabs...', 0);

            for (const folder of sortedFolderNames) {
                await this.loadTab(folder);
                this.loadedTabsCount++;
                const loadProgress = (this.loadedTabsCount / this.totalTabs) * 50;
                this.updateProgress(`Loaded ${folder}`, loadProgress);
            }

            this.updateProgress('Waiting for tabs to initialize...', 50);
            console.log(`Loaded ${sortedFolderNames.length} folder-based tabs, waiting for initialization...`);

            // Set a timeout for all tabs to initialize
            this.waitForInitialization();

        } catch (error) {
            console.error('Error initializing tab loader:', error);
            this.updateProgress('Error loading tabs', 100);
            if (this.onCompleteCallback) {
                setTimeout(() => this.onCompleteCallback(), 1000);
            }
        }
    }

    /**
     * Wait for all tabs to initialize with a global timeout
     */
    waitForInitialization() {
        const timeout = 10000; // 10 seconds global timeout
        const checkInterval = 100;
        let elapsedTime = 0;

        const intervalId = setInterval(() => {
            elapsedTime += checkInterval;

            // If all tabs are ready, stop checking
            if (this.initializedTabsCount >= this.totalTabs) {
                clearInterval(intervalId);
                return;
            }

            // If timeout is reached
            if (elapsedTime >= timeout) {
                clearInterval(intervalId);
                console.warn(`Tab initialization timed out after ${timeout / 1000}s.`);

                const uninitializedTabs = Array.from(this.tabReadyCallbacks.keys());
                if (uninitializedTabs.length > 0) {
                    console.error('The following tabs failed to initialize in time:', uninitializedTabs);
                    
                    // To prevent the app from getting stuck, mark remaining tabs as ready
                    uninitializedTabs.forEach(tabId => {
                        console.warn(`Force marking tab as ready: ${tabId}`);
                        this.markTabAsReady(tabId);
                    });
                }
                
                // The onCompleteCallback will be triggered by the last markTabAsReady call
            }
        }, checkInterval);
    }

    /**
     * Update loading progress
     */
    updateProgress(message, percentage) {
        if (this.onProgressCallback) {
            this.onProgressCallback(message, percentage);
        }
    }

    /**
     * Load a single tab from its folder
     */
    async loadTab(folderName) {
        try {
            console.log(`Loading tab from folder: ${folderName}`);
            
            // Get tab content from main process
            const tabData = await window.electronAPI.getTabContent(folderName);
            const { config, html, css, js } = tabData;
            
            // Generate unique tab ID
            const tabId = folderName;
            
            // Create tab item in sidebar
            this.createTabItem(tabId, config);
            
            // Create tab content area
            this.createTabContent(tabId, config, html);
            
            // Load tab-specific CSS
            if (css.trim()) {
                this.loadTabCSS(tabId, css);
            }
            
            // Store tab data for later use
            this.loadedTabs.set(tabId, {
                folder: folderName,
                config,
                html,
                css,
                js
            });
            
            // Register tab for initialization tracking
            this.registerTabForInitialization(tabId);

            // Execute tab-specific JavaScript after DOM is ready
            if (js.trim()) {
                this.executeTabJS(tabId, js);
            } else {
                // If no JavaScript, mark as ready immediately
                this.markTabAsReady(tabId);
            }
            
            console.log(`Successfully loaded tab: ${config.name} (${tabId})`);
            
        } catch (error) {
            console.error(`Error loading tab from folder ${folderName}:`, error);
        }
    }

    /**
     * Create tab item in the sidebar
     */
    createTabItem(tabId, config) {
        const tabList = document.getElementById('tab-list');
        if (!tabList) return;
        
        const tabItem = document.createElement('li');
        tabItem.className = 'tab-item';
        tabItem.setAttribute('data-tab', tabId);
        tabItem.innerHTML = `
            <i class="${config.icon || 'fas fa-cog'}"></i>
            <span>${config.name || 'Unnamed Tab'}</span>
        `;
        
        // Add click handler
        tabItem.addEventListener('click', () => {
            if (window.switchToTab) {
                window.switchToTab(tabId);
            }
        });

        tabList.appendChild(tabItem);

        // Make the new tab draggable if the feature is enabled
        if (window.makeNewTabDraggable) {
            window.makeNewTabDraggable(tabItem);
        }
    }

    /**
     * Create tab content area
     */
    createTabContent(tabId, config, html) {
        const contentArea = document.querySelector('.content-area');
        if (!contentArea) return;
        
        const tabContent = document.createElement('div');
        tabContent.id = `tab-${tabId}`;
        tabContent.className = 'tab-content';
        tabContent.setAttribute('data-tab-folder', config.folder || '');
        
        // Wrap the HTML content in a container for scoping
        tabContent.innerHTML = `
            <div class="folder-tab-container" data-tab="${tabId}">
                ${html}
            </div>
        `;
        
        contentArea.appendChild(tabContent);
    }

    /**
     * Load tab-specific CSS with scoping
     */
    loadTabCSS(tabId, css) {
        // Scope the CSS to this specific tab
        const scopedCSS = this.scopeCSS(css, `[data-tab="${tabId}"]`);
        
        // Create style element
        const styleElement = document.createElement('style');
        styleElement.setAttribute('data-tab', tabId);
        styleElement.textContent = scopedCSS;
        
        // Add to document head
        document.head.appendChild(styleElement);
        
        // Store reference for cleanup
        this.styleElements.set(tabId, styleElement);
    }

    /**
     * Scope CSS rules to a specific container
     */
    scopeCSS(css, scope) {
        // Simple CSS scoping - prepend scope to each rule
        // This is a basic implementation; for production, consider using a proper CSS parser
        return css.replace(/([^{}]+){/g, (match, selector) => {
            // Skip @rules like @media, @keyframes, etc.
            if (selector.trim().startsWith('@')) {
                return match;
            }
            
            // Add scope to each selector
            const selectors = selector.split(',').map(s => {
                const trimmed = s.trim();
                if (trimmed.startsWith(':root') || trimmed.startsWith('html') || trimmed.startsWith('body')) {
                    return `${scope} ${trimmed}`;
                }
                return `${scope} ${trimmed}`;
            });
            
            return `${selectors.join(', ')}{`;
        });
    }

    /**
     * Execute tab-specific JavaScript in a safe scope
     */
    executeTabJS(tabId, js) {
        try {
            // Create a function scope for the tab's JavaScript
            const tabScope = {
                tabId: tabId,
                tabContainer: document.querySelector(`.folder-tab-container[data-tab="${tabId}"]`),
                console: console,
                window: window,
                document: document,
                navigator: navigator,
                screen: screen,
                setTimeout: setTimeout,
                setInterval: setInterval,
                clearTimeout: clearTimeout,
                clearInterval: clearInterval,
                Date: Date,
                Intl: Intl,
                // Add any other safe globals the tab might need
            };

            // Execute the JavaScript with access to necessary globals
            // For tab functions to work with onclick handlers, we need to execute in global scope
            const func = new Function(`
                // Make tab-specific variables available
                const tabId = "${tabId}";
                const tabContainer = document.querySelector('.folder-tab-container[data-tab="${tabId}"]');

                // Make tab loader available for ready signaling
                const tabLoader = window.tabLoader;

                ${js}

                // IMPORTANT: Tab scripts are now REQUIRED to call
                // tabLoader.markTabAsReady(tabId) or window.markTabAsReady(tabId)
                // when they are fully initialized.
            `);

            func();

            console.log(`Executed JavaScript for tab: ${tabId}`);

        } catch (error) {
            console.error(`Error executing JavaScript for tab ${tabId}:`, error);
            // If JS execution fails, mark it as "ready" to not block other tabs
            this.markTabAsReady(tabId);
        }
    }

    /**
     * Get loaded tab data
     */
    getTabData(tabId) {
        return this.loadedTabs.get(tabId);
    }

    /**
     * Remove a tab and clean up its resources
     */
    removeTab(tabId) {
        // Remove style element
        const styleElement = this.styleElements.get(tabId);
        if (styleElement) {
            styleElement.remove();
            this.styleElements.delete(tabId);
        }
        
        // Remove tab data
        this.loadedTabs.delete(tabId);
        
        // Remove DOM elements
        const tabItem = document.querySelector(`[data-tab="${tabId}"]`);
        if (tabItem) tabItem.remove();
        
        const tabContent = document.getElementById(`tab-${tabId}`);
        if (tabContent) tabContent.remove();
        
        console.log(`Removed tab: ${tabId}`);
    }

    /**
     * Reload a specific tab
     */
    async reloadTab(folderName) {
        const tabId = folderName;
        
        // Remove existing tab
        this.removeTab(tabId);
        
        // Reload tab
        await this.loadTab(folderName);
    }

    /**
     * Get list of all loaded folder-based tabs
     */
    getLoadedTabs() {
        return Array.from(this.loadedTabs.keys());
    }
}

// Export for use in other modules
window.TabLoader = TabLoader;

// Global function for tabs to signal they're ready
window.markTabAsReady = function(tabId) {
    if (window.tabLoader && typeof window.tabLoader.markTabAsReady === 'function') {
        window.tabLoader.markTabAsReady(tabId);
    } else {
        console.warn('TabLoader not available, cannot mark tab as ready:', tabId);
    }
};

console.log('Tab loader module loaded');
