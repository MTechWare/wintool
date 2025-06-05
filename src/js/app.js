/**
 * WinTool - Main Application JavaScript
 *
 * This file contains all the client-side logic for WinTool.
 * It's designed to be easy to understand and extend.
 */

// Global state
let currentTab = 'welcome';
let tabs = new Map();
let tabLoader = null;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log('WinTool starting...');

    // Show splash screen
    showSplashScreen();

    // Initialize all components
    initWindowControls();
    initTabSystem();
    initModals();
    initSystemTrayListeners();

    // Update splash progress
    updateSplashProgress('Loading settings...', 20);
    await new Promise(resolve => setTimeout(resolve, 300));

    // Load and apply saved settings
    await loadAndApplyStartupSettings();





    // Continue with normal startup
    await continueNormalStartup();
});

/**
 * Show splash screen
 */
function showSplashScreen() {
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
        splashScreen.classList.remove('hidden');
        console.log('Splash screen shown');
    }
}

/**
 * Update splash screen progress
 */
function updateSplashProgress(message, percentage) {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');

    if (progressFill) {
        progressFill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
    }

    if (progressText) {
        progressText.textContent = message;
    }

    console.log(`Splash progress: ${percentage}% - ${message}`);
}

/**
 * Hide splash screen
 */
function hideSplashScreen() {
    const splashScreen = document.getElementById('splash-screen');
    const appContainer = document.querySelector('.app-container');

    if (splashScreen) {
        splashScreen.classList.add('hidden');

        // Show main app container
        if (appContainer) {
            appContainer.classList.add('loaded');
        }

        // Remove splash screen from DOM after transition
        setTimeout(() => {
            if (splashScreen.parentNode) {
                splashScreen.parentNode.removeChild(splashScreen);
            }
        }, 1000);

        console.log('Splash screen hidden');
    }
}

/**
 * Initialize window control buttons (minimize, maximize, close)
 */
function initWindowControls() {
    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeBtn = document.getElementById('maximize-btn');
    const closeBtn = document.getElementById('close-btn');
    
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', async () => {
            if (window.electronAPI) {
                // Always hide to tray when minimizing
                await window.electronAPI.hideToTray();
            }
        });
    }
    
    if (maximizeBtn) {
        maximizeBtn.addEventListener('click', async () => {
            if (window.electronAPI) {
                await window.electronAPI.maximizeWindow();
            }
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', async () => {
            if (window.electronAPI) {
                await window.electronAPI.closeWindow();
            }
        });
    }
}

/**
 * Initialize the tab system
 */
function initTabSystem() {
    // Add click handlers to existing tabs
    const tabItems = document.querySelectorAll('.tab-item');
    tabItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabName = item.getAttribute('data-tab');
            switchToTab(tabName);
        });
    });

    // Initialize tab search functionality
    initTabSearch();

    // Initialize draggable tabs functionality
    initDraggableTabs();

    // Add tab button removed - no longer needed

    // Register the welcome tab
    tabs.set('welcome', {
        name: 'Welcome',
        icon: 'fas fa-home',
        content: document.getElementById('tab-welcome').innerHTML
    });
}

/**
 * Initialize tab search functionality
 */
function initTabSearch() {
    const searchInput = document.getElementById('tab-search');
    if (!searchInput) return;

    // Add search event listener
    searchInput.addEventListener('input', (e) => {
        searchTabs(e.target.value);
    });

    // Clear search on Escape key
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            searchTabs('');
            searchInput.blur();
        }
    });

    // Add Ctrl+F shortcut to focus search
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
    });
}

/**
 * Search tabs by name
 * @param {string} searchTerm - The search term to filter tabs
 */
function searchTabs(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    const tabItems = document.querySelectorAll('.tab-item');

    tabItems.forEach(tabItem => {
        const tabName = tabItem.querySelector('span').textContent.toLowerCase();
        const isMatch = term === '' || tabName.includes(term);

        if (isMatch) {
            tabItem.classList.remove('hidden');
        } else {
            tabItem.classList.add('hidden');
        }
    });
}

/**
 * Initialize draggable tabs functionality
 */
async function initDraggableTabs() {
    try {
        // Always enable draggable tabs
        enableDraggableTabsFunction();
        // Load saved tab order
        await loadTabOrder();
    } catch (error) {
        console.error('Error initializing draggable tabs:', error);
    }
}

/**
 * Enable draggable functionality for tabs
 */
function enableDraggableTabsFunction() {
    const tabList = document.getElementById('tab-list');
    if (!tabList) return;

    // Add draggable class to tab list
    tabList.classList.add('draggable-enabled');

    // Make existing tabs draggable
    makeAllTabsDraggable();
}



/**
 * Make all existing tabs draggable
 */
function makeAllTabsDraggable() {
    const tabItems = document.querySelectorAll('.tab-item');

    tabItems.forEach(tabItem => {
        tabItem.draggable = true;
        tabItem.classList.add('draggable');
        addDragListeners(tabItem);
    });
}

/**
 * Add drag event listeners to a tab item
 */
function addDragListeners(tabItem) {
    tabItem.addEventListener('dragstart', handleDragStart);
    tabItem.addEventListener('dragend', handleDragEnd);
    tabItem.addEventListener('dragover', handleDragOver);
    tabItem.addEventListener('drop', handleDrop);
    tabItem.addEventListener('dragenter', handleDragEnter);
    tabItem.addEventListener('dragleave', handleDragLeave);
}



// Global variables for drag and drop
let draggedTab = null;
let dragOverTab = null;

/**
 * Handle drag start event
 */
function handleDragStart(e) {
    draggedTab = this;
    this.classList.add('dragging');

    // Set drag data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.outerHTML);

    // Add drag-active class to tab list
    const tabList = document.getElementById('tab-list');
    if (tabList) {
        tabList.classList.add('drag-active');
    }
}

/**
 * Handle drag end event
 */
function handleDragEnd(e) {
    this.classList.remove('dragging');

    // Remove drag-active class from tab list
    const tabList = document.getElementById('tab-list');
    if (tabList) {
        tabList.classList.remove('drag-active');
    }

    // Clean up drag over states
    const tabItems = document.querySelectorAll('.tab-item');
    tabItems.forEach(item => {
        item.classList.remove('drag-over', 'drag-over-bottom');
    });

    draggedTab = null;
    dragOverTab = null;
}

/**
 * Handle drag over event
 */
function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }

    e.dataTransfer.dropEffect = 'move';
    return false;
}

/**
 * Handle drag enter event
 */
function handleDragEnter(e) {
    if (this === draggedTab) return;

    dragOverTab = this;

    // Determine if we should show drop indicator above or below
    const rect = this.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;

    if (e.clientY < midpoint) {
        this.classList.add('drag-over');
        this.classList.remove('drag-over-bottom');
    } else {
        this.classList.add('drag-over-bottom');
        this.classList.remove('drag-over');
    }
}

/**
 * Handle drag leave event
 */
function handleDragLeave(e) {
    // Only remove classes if we're actually leaving this element
    if (!this.contains(e.relatedTarget)) {
        this.classList.remove('drag-over', 'drag-over-bottom');
    }
}

/**
 * Handle drop event
 */
function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    if (draggedTab !== this) {
        // Determine drop position
        const rect = this.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const insertBefore = e.clientY < midpoint;

        // Move the dragged tab
        const tabList = document.getElementById('tab-list');
        if (insertBefore) {
            tabList.insertBefore(draggedTab, this);
        } else {
            tabList.insertBefore(draggedTab, this.nextSibling);
        }

        // Save the new tab order
        saveTabOrder();
    }

    return false;
}

/**
 * Save current tab order to settings
 */
async function saveTabOrder() {
    try {
        if (!window.electronAPI) return;

        const tabItems = document.querySelectorAll('.tab-item');
        const tabOrder = Array.from(tabItems).map(item => item.getAttribute('data-tab'));

        await window.electronAPI.setSetting('tabOrder', tabOrder);
        console.log('Tab order saved:', tabOrder);
    } catch (error) {
        console.error('Error saving tab order:', error);
    }
}

/**
 * Load and apply saved tab order
 */
async function loadTabOrder() {
    try {
        if (!window.electronAPI) return;

        const savedOrder = await window.electronAPI.getSetting('tabOrder', []);
        if (!savedOrder || savedOrder.length === 0) return;

        const tabList = document.getElementById('tab-list');
        if (!tabList) return;

        // Create a map of current tabs
        const tabItems = document.querySelectorAll('.tab-item');
        const tabMap = new Map();
        tabItems.forEach(item => {
            const tabId = item.getAttribute('data-tab');
            tabMap.set(tabId, item);
        });

        // Reorder tabs according to saved order
        savedOrder.forEach(tabId => {
            const tabItem = tabMap.get(tabId);
            if (tabItem) {
                tabList.appendChild(tabItem);
                tabMap.delete(tabId);
            }
        });

        // Append any remaining tabs that weren't in the saved order
        tabMap.forEach(tabItem => {
            tabList.appendChild(tabItem);
        });

        console.log('Tab order loaded and applied:', savedOrder);
    } catch (error) {
        console.error('Error loading tab order:', error);
    }
}



/**
 * Make newly added tabs draggable
 */
function makeNewTabDraggable(tabItem) {
    try {
        tabItem.draggable = true;
        tabItem.classList.add('draggable');
        addDragListeners(tabItem);
    } catch (error) {
        console.error('Error making new tab draggable:', error);
    }
}

/**
 * Initialize modal functionality
 */
function initModals() {
    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target.id);
        }
    });
    
    // Close modals with escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal[style*="flex"]');
            if (openModal) {
                closeModal(openModal.id);
            }
        }
    });
}

/**
 * Switch to a specific tab
 */
async function switchToTab(tabName) {
    console.log(`Attempting to switch to tab: ${tabName}`);

    // Validate that the tab exists
    const targetTabElement = document.querySelector(`[data-tab="${tabName}"]`);
    const targetContentElement = document.getElementById(`tab-${tabName}`);

    if (!targetTabElement || !targetContentElement) {
        console.error(`Tab "${tabName}" not found. Available tabs:`,
            Array.from(document.querySelectorAll('.tab-item')).map(item => item.getAttribute('data-tab')));
        return;
    }

    currentTab = tabName;

    // Update tab items (sidebar)
    const tabItems = document.querySelectorAll('.tab-item');
    tabItems.forEach(item => {
        if (item.getAttribute('data-tab') === tabName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Update tab content
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        if (content.id === `tab-${tabName}`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });

    // Save last active tab if setting is enabled
    try {
        if (window.electronAPI) {
            const rememberLastTab = await window.electronAPI.getSetting('rememberLastTab', false);
            if (rememberLastTab) {
                await window.electronAPI.setSetting('lastActiveTab', tabName);
                console.log(`Saved last active tab: ${tabName}`);
            }
        }
    } catch (error) {
        console.error('Error saving last active tab:', error);
    }

    console.log(`Successfully switched to tab: ${tabName}`);
}

// addNewTab function removed - feature disabled

// createNewTab function removed - feature disabled

/**
 * Close a modal
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Tab saving and loading functions removed - feature disabled

/**
 * Show system information modal
 */
async function showSystemInfo() {
    const modal = document.getElementById('system-info-modal');
    const content = document.getElementById('system-info-content');

    if (modal && content) {
        // Show loading state
        content.innerHTML = '<p>Loading system information...</p>';
        modal.style.display = 'flex';

        try {
            // Get system info from main process
            if (window.electronAPI) {
                const systemInfo = await window.electronAPI.getSystemInfo();

                // Create system info display
                content.innerHTML = `
                    <div class="system-info-grid">
                        <div class="system-info-item">
                            <h4>Platform</h4>
                            <p>${systemInfo.platform}</p>
                        </div>
                        <div class="system-info-item">
                            <h4>Architecture</h4>
                            <p>${systemInfo.arch}</p>
                        </div>
                        <div class="system-info-item">
                            <h4>Hostname</h4>
                            <p>${systemInfo.hostname}</p>
                        </div>
                        <div class="system-info-item">
                            <h4>Total Memory</h4>
                            <p>${systemInfo.totalMemory}</p>
                        </div>
                        <div class="system-info-item">
                            <h4>Free Memory</h4>
                            <p>${systemInfo.freeMemory}</p>
                        </div>
                        <div class="system-info-item">
                            <h4>CPU Cores</h4>
                            <p>${systemInfo.cpus}</p>
                        </div>
                        <div class="system-info-item">
                            <h4>Uptime</h4>
                            <p>${systemInfo.uptime}</p>
                        </div>
                    </div>
                `;
            } else {
                content.innerHTML = '<p>System information not available (running in browser)</p>';
            }
        } catch (error) {
            console.error('Error getting system info:', error);
            content.innerHTML = '<p>Error loading system information</p>';
        }
    }
}

/**
 * Show settings modal
 */
async function showSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        // Load current settings
        await loadCurrentSettings();

        // Initialize settings navigation
        initSettingsNavigation();

        // Show modal
        modal.style.display = 'flex';

        console.log('Settings modal opened');
    }
}







/**
 * Continue normal startup process
 */
async function continueNormalStartup() {
    try {
        // Update splash progress
        updateSplashProgress('Initializing tabs...', 40);
        await new Promise(resolve => setTimeout(resolve, 300));

        // Initialize tab loader for folder-based tabs
        if (window.TabLoader) {
            tabLoader = new window.TabLoader();
            // Make tabLoader globally available for tab scripts
            window.tabLoader = tabLoader;

            // Set up progress callbacks
            tabLoader.setProgressCallback((message, percentage) => {
                const adjustedPercentage = 40 + (percentage * 0.6); // Scale from 40% to 100%
                updateSplashProgress(message, adjustedPercentage);
            });

            tabLoader.setCompleteCallback(async () => {
                // Restore last active tab after all tabs are loaded
                await restoreLastActiveTab();
                hideSplashScreen();
            });

            await tabLoader.init();
        } else {
            // If no tab loader, restore last active tab and hide splash screen after a delay
            setTimeout(async () => {
                await restoreLastActiveTab();
                updateSplashProgress('Ready!', 100);
                setTimeout(hideSplashScreen, 500);
            }, 1000);
        }

        console.log('WinTool startup complete');
    } catch (error) {
        console.error('Error during normal startup:', error);
        hideSplashScreen();
    }
}

/**
 * Load current settings from storage
 */
async function loadCurrentSettings() {
    try {
        if (window.electronAPI) {


            // Load primary color
            const primaryColor = await window.electronAPI.getSetting('primaryColor', '#ff9800');
            const colorPicker = document.getElementById('primary-color-picker');
            const colorPreview = document.getElementById('primary-color-preview');
            if (colorPicker && colorPreview) {
                colorPicker.value = primaryColor;
                colorPreview.textContent = primaryColor;
            }

            // Load window size
            const windowSize = await window.electronAPI.getSetting('windowSize', '60');
            const windowSizeSelect = document.getElementById('window-size-select');
            if (windowSizeSelect) {
                windowSizeSelect.value = windowSize;
            }

            // Load behavior settings
            const rememberLastTab = await window.electronAPI.getSetting('rememberLastTab', false);
            const rememberLastTabCheckbox = document.getElementById('remember-last-tab');
            if (rememberLastTabCheckbox) {
                rememberLastTabCheckbox.checked = rememberLastTab;
            }

            const autoRefreshData = await window.electronAPI.getSetting('autoRefreshData', true);
            const autoRefreshCheckbox = document.getElementById('auto-refresh-data');
            if (autoRefreshCheckbox) {
                autoRefreshCheckbox.checked = autoRefreshData;
            }





            // Load advanced settings
            const enableDevTools = await window.electronAPI.getSetting('enableDevTools', true);
            const enableDevToolsCheckbox = document.getElementById('enable-dev-tools');
            if (enableDevToolsCheckbox) {
                enableDevToolsCheckbox.checked = enableDevTools;
            }

            const refreshInterval = await window.electronAPI.getSetting('refreshInterval', '30');
            const refreshIntervalSelect = document.getElementById('refresh-interval-select');
            if (refreshIntervalSelect) {
                refreshIntervalSelect.value = refreshInterval;
            }
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

/**
 * Initialize settings navigation
 */
function initSettingsNavigation() {
    const navItems = document.querySelectorAll('.settings-nav-item');
    const panels = document.querySelectorAll('.settings-panel');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTab = item.getAttribute('data-settings-tab');

            // Update nav items
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Update panels
            panels.forEach(panel => panel.classList.remove('active'));
            const targetPanel = document.getElementById(`settings-${targetTab}`);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });

    // Initialize color picker
    const colorPicker = document.getElementById('primary-color-picker');
    const colorPreview = document.getElementById('primary-color-preview');
    if (colorPicker && colorPreview) {
        colorPicker.addEventListener('input', (e) => {
            const color = e.target.value;
            colorPreview.textContent = color;
            // Apply color preview immediately with all related variables
            updatePrimaryColorVariables(color);
        });
    }
}

/**
 * Save settings
 */
async function saveSettings() {
    try {
        if (window.electronAPI) {


            // Save primary color
            const primaryColor = document.getElementById('primary-color-picker')?.value || '#ff9800';
            await window.electronAPI.setSetting('primaryColor', primaryColor);

            // Save window size
            const windowSize = document.getElementById('window-size-select')?.value || '60';
            await window.electronAPI.setSetting('windowSize', windowSize);

            // Save behavior settings
            const rememberLastTab = document.getElementById('remember-last-tab')?.checked || false;
            await window.electronAPI.setSetting('rememberLastTab', rememberLastTab);

            const autoRefreshData = document.getElementById('auto-refresh-data')?.checked || true;
            await window.electronAPI.setSetting('autoRefreshData', autoRefreshData);



            // Save advanced settings
            const enableDevTools = document.getElementById('enable-dev-tools')?.checked || true;
            await window.electronAPI.setSetting('enableDevTools', enableDevTools);

            const refreshInterval = document.getElementById('refresh-interval-select')?.value || '30';
            await window.electronAPI.setSetting('refreshInterval', refreshInterval);

            // Apply settings immediately
            applySettings();

            // Close modal
            closeModal('settings-modal');

            console.log('Settings saved successfully');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

/**
 * Reset settings to defaults
 */
async function resetSettings() {
    if (confirm('Are you sure you want to reset ALL settings to their default values? This will erase everything and restart the application.')) {
        try {
            if (window.electronAPI) {
                console.log('Resetting all settings to defaults...');

                // Clear all stored settings by calling the backend to clear the entire store
                await window.electronAPI.clearAllSettings();

                console.log('All settings cleared, restarting application...');

                // Show a brief message before restart
                alert('Settings have been reset to defaults. The application will now restart.');

                // Restart the application to ensure clean state
                await window.electronAPI.restartApplication();
            }
        } catch (error) {
            console.error('Error resetting settings:', error);
            alert('Error resetting settings. Please restart the application manually.');
        }
    }
}

/**
 * Load and apply settings on startup
 */
async function loadAndApplyStartupSettings() {
    try {
        if (window.electronAPI) {
            // Load and apply primary color with all related variables
            const primaryColor = await window.electronAPI.getSetting('primaryColor', '#ff9800');
            updatePrimaryColorVariables(primaryColor);

            // Note: Tab restoration is now handled after all tabs are loaded
            // See restoreLastActiveTab() function which is called from startTabRestorationProcess()

            // Load tab order after tabs are loaded
            setTimeout(async () => {
                await loadTabOrder();
            }, 1000);

            console.log('Startup settings loaded and applied');
        }
    } catch (error) {
        console.error('Error loading startup settings:', error);
    }
}

/**
 * Restore the last active tab if the setting is enabled
 * This function is called after all tabs are loaded to ensure the target tab exists
 */
async function restoreLastActiveTab() {
    try {
        if (!window.electronAPI) {
            console.log('No electronAPI available, skipping tab restoration');
            return;
        }

        // Check if remember last tab setting is enabled
        const rememberLastTab = await window.electronAPI.getSetting('rememberLastTab', false);
        if (!rememberLastTab) {
            console.log('Remember last tab setting is disabled');
            return;
        }

        // Get the last active tab
        const lastActiveTab = await window.electronAPI.getSetting('lastActiveTab', 'welcome');
        if (!lastActiveTab || lastActiveTab === 'welcome') {
            console.log('No last active tab to restore or it\'s already welcome tab');
            return;
        }

        // Check if the target tab exists
        const targetTabElement = document.querySelector(`[data-tab="${lastActiveTab}"]`);
        const targetContentElement = document.getElementById(`tab-${lastActiveTab}`);

        if (!targetTabElement || !targetContentElement) {
            console.warn(`Target tab "${lastActiveTab}" not found, falling back to welcome tab`);
            // Clear the invalid saved tab
            await window.electronAPI.setSetting('lastActiveTab', 'welcome');
            return;
        }

        // Switch to the last active tab
        console.log(`Restoring last active tab: ${lastActiveTab}`);
        switchToTab(lastActiveTab);

    } catch (error) {
        console.error('Error restoring last active tab:', error);
        // Fallback to welcome tab on error
        try {
            switchToTab('welcome');
        } catch (fallbackError) {
            console.error('Error switching to welcome tab as fallback:', fallbackError);
        }
    }
}

/**
 * Apply settings immediately
 */
function applySettings() {
    // Apply primary color and related variables
    const primaryColor = document.getElementById('primary-color-picker')?.value || '#ff9800';
    updatePrimaryColorVariables(primaryColor);

    // Note: Other settings like window size, dev tools, etc. may require app restart
    // This could be enhanced to show a notification about restart requirements
}

/**
 * Update all primary color related CSS variables
 */
function updatePrimaryColorVariables(color) {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Calculate darker variants
    const darkerColor = darkenColor(color, 0.15);
    const darkestColor = darkenColor(color, 0.3);

    // Update CSS variables
    document.documentElement.style.setProperty('--primary-color', color);
    document.documentElement.style.setProperty('--primary-dark', darkerColor);
    document.documentElement.style.setProperty('--primary-darker', darkestColor);
    document.documentElement.style.setProperty('--primary-rgb', `${r}, ${g}, ${b}`);
}

/**
 * Darken a hex color by a percentage
 */
function darkenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent * 100);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

/**
 * Initialize system tray event listeners
 */
function initSystemTrayListeners() {
    // Listen for show-settings message from main process (triggered from tray menu)
    if (window.electronAPI && window.electronAPI.onMessage) {
        window.electronAPI.onMessage((event, message) => {
            if (message === 'show-settings') {
                showSettings();
            }
        });
    }
}

/**
 * Hide application to system tray
 */
async function hideToTray() {
    if (window.electronAPI) {
        await window.electronAPI.hideToTray();
    }
}

/**
 * Show application from system tray
 */
async function showFromTray() {
    if (window.electronAPI) {
        await window.electronAPI.showFromTray();
    }
}

/**
 * Quit application completely
 */
async function quitApplication() {
    if (window.electronAPI) {
        await window.electronAPI.quitApp();
    }
}

// Global functions for HTML onclick handlers
window.closeModal = closeModal;
window.showSystemInfo = showSystemInfo;
window.showSettings = showSettings;
window.saveSettings = saveSettings;
window.resetSettings = resetSettings;
window.switchToTab = switchToTab;
window.hideToTray = hideToTray;
window.showFromTray = showFromTray;
window.quitApplication = quitApplication;
window.showSplashScreen = showSplashScreen;
window.updateSplashProgress = updateSplashProgress;
window.hideSplashScreen = hideSplashScreen;


console.log('WinTool app.js loaded');
