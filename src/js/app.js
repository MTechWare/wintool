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
    initGlobalKeyboardShortcuts();

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
}

// Default keyboard shortcuts
const DEFAULT_SHORTCUTS = {
    'focus-search': 'Ctrl+F',
    'refresh-tab': 'Ctrl+R',
    'refresh-system': 'F5',
    'open-settings': 'Ctrl+S',
    'close-modal': 'Escape'
};

// Current keyboard shortcuts (loaded from settings)
let currentShortcuts = { ...DEFAULT_SHORTCUTS };

/**
 * Initialize global keyboard shortcuts
 */
function initGlobalKeyboardShortcuts() {
    // Load custom shortcuts from settings
    loadCustomShortcuts();

    document.addEventListener('keydown', (e) => {
        // Don't handle shortcuts if user is typing in an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
            // Exception: still handle Escape key to close modals
            if (matchesShortcut(e, currentShortcuts['close-modal'])) {
                const openModal = document.querySelector('.modal[style*="flex"]');
                if (openModal) {
                    e.preventDefault();
                    closeModal(openModal.id);
                }
            }
            return;
        }

        // Check each shortcut
        if (matchesShortcut(e, currentShortcuts['focus-search'])) {
            e.preventDefault();
            const searchInput = document.getElementById('tab-search');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        } else if (matchesShortcut(e, currentShortcuts['refresh-tab'])) {
            e.preventDefault();
            refreshCurrentTab();
        } else if (matchesShortcut(e, currentShortcuts['open-settings'])) {
            e.preventDefault();
            showSettings();
        } else if (matchesShortcut(e, currentShortcuts['refresh-system'])) {
            e.preventDefault();
            refreshSystemInformation();
        } else if (matchesShortcut(e, currentShortcuts['close-modal'])) {
            const openModal = document.querySelector('.modal[style*="flex"]');
            if (openModal) {
                e.preventDefault();
                closeModal(openModal.id);
            }
        }
    });
}

/**
 * Check if a keyboard event matches a shortcut string
 */
function matchesShortcut(event, shortcutString) {
    if (!shortcutString) return false;

    const parts = shortcutString.split('+').map(part => part.trim());
    const key = parts[parts.length - 1].toLowerCase();
    const modifiers = parts.slice(0, -1).map(mod => mod.toLowerCase());

    // Check if the key matches
    const eventKey = event.key.toLowerCase();
    if (eventKey !== key.toLowerCase() && event.code.toLowerCase() !== key.toLowerCase()) {
        return false;
    }

    // Check modifiers
    const hasCtrl = modifiers.includes('ctrl');
    const hasAlt = modifiers.includes('alt');
    const hasShift = modifiers.includes('shift');
    const hasMeta = modifiers.includes('meta') || modifiers.includes('cmd');

    return event.ctrlKey === hasCtrl &&
           event.altKey === hasAlt &&
           event.shiftKey === hasShift &&
           event.metaKey === hasMeta;
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

    // Add click handlers to all modal close buttons
    const closeButtons = document.querySelectorAll('.modal .close-btn');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) {
                closeModal(modal.id);
            }
        });
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
    console.log('Attempting to close modal:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        console.log('Modal found, closing...');
        modal.style.display = 'none';
        console.log('Modal closed successfully');
    } else {
        console.error('Modal not found:', modalId);
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

            // Load keyboard shortcuts
            await loadKeyboardShortcutsSettings();
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
        console.log('Starting to save settings...');
        
        if (window.electronAPI) {
            // Save primary color
            const primaryColor = document.getElementById('primary-color-picker')?.value || '#ff9800';
            console.log('Saving primary color:', primaryColor);
            await window.electronAPI.setSetting('primaryColor', primaryColor);

            // Save window size
            const windowSize = document.getElementById('window-size-select')?.value || '60';
            console.log('Saving window size:', windowSize);
            await window.electronAPI.setSetting('windowSize', windowSize);

            // Save behavior settings
            const rememberLastTab = document.getElementById('remember-last-tab')?.checked || false;
            console.log('Saving remember last tab:', rememberLastTab);
            await window.electronAPI.setSetting('rememberLastTab', rememberLastTab);

            const autoRefreshData = document.getElementById('auto-refresh-data')?.checked || true;
            console.log('Saving auto refresh data:', autoRefreshData);
            await window.electronAPI.setSetting('autoRefreshData', autoRefreshData);

            // Save advanced settings
            const enableDevTools = document.getElementById('enable-dev-tools')?.checked || true;
            console.log('Saving enable dev tools:', enableDevTools);
            await window.electronAPI.setSetting('enableDevTools', enableDevTools);

            const refreshInterval = document.getElementById('refresh-interval-select')?.value || '30';
            console.log('Saving refresh interval:', refreshInterval);
            await window.electronAPI.setSetting('refreshInterval', refreshInterval);

            // Save keyboard shortcuts
            console.log('Saving keyboard shortcuts...');
            await saveKeyboardShortcuts();

            // Apply settings immediately
            console.log('Applying settings...');
            applySettings();

            console.log('Settings saved successfully, closing modal...');
            
            // Close modal after successful save
            const modal = document.getElementById('settings-modal');
            if (modal) {
                modal.style.display = 'none';
            }
            
            showNotification('Settings saved successfully!', 'success');
        } else {
            console.error('electronAPI not available');
            showNotification('Error: electronAPI not available', 'error');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Error saving settings: ' + error.message, 'error');
    }
}

/**
 * Cancel settings changes and close modal
 */
function cancelSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ...existing code...

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

/**
 * Refresh the current active tab's data
 */
async function refreshCurrentTab() {
    console.log(`Refreshing current tab: ${currentTab}`);

    try {
        // Get the active tab content element
        const activeTabContent = document.querySelector('.tab-content.active');
        if (!activeTabContent) {
            console.warn('No active tab found to refresh');
            return;
        }

        // Show a brief loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'refresh-indicator';
        loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
        loadingIndicator.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: var(--primary-color);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        activeTabContent.style.position = 'relative';
        activeTabContent.appendChild(loadingIndicator);

        // Remove loading indicator after 2 seconds
        setTimeout(() => {
            if (loadingIndicator.parentNode) {
                loadingIndicator.remove();
            }
        }, 2000);

        // Handle different tab types
        if (currentTab === 'system-info' || currentTab === 'folder-system-info') {
            // Refresh system information
            await refreshSystemInformation();
        } else if (currentTab === 'networking' || currentTab === 'folder-networking') {
            // Refresh networking information
            const container = activeTabContent;
            if (window.loadNetworkingInfo && typeof window.loadNetworkingInfo === 'function') {
                await window.loadNetworkingInfo(container);
            }
        } else if (currentTab === 'services' || currentTab === 'folder-services') {
            // Refresh services
            const refreshBtn = activeTabContent.querySelector('[id*="refresh-services"]');
            if (refreshBtn) {
                refreshBtn.click();
            }
        } else if (currentTab === 'environment-variables' || currentTab === 'folder-environment-variables') {
            // Refresh environment variables
            if (window.refreshEnvironmentVariables && typeof window.refreshEnvironmentVariables === 'function') {
                await window.refreshEnvironmentVariables();
            }
        } else if (currentTab === 'applications' || currentTab === 'folder-applications') {
            // Refresh applications
            const refreshBtn = activeTabContent.querySelector('[id*="refresh-applications"]');
            if (refreshBtn) {
                refreshBtn.click();
            }
        } else if (currentTab === 'cleanup' || currentTab === 'folder-cleanup') {
            // Refresh cleanup data
            const refreshBtn = activeTabContent.querySelector('[id*="refresh-cleanup"]');
            if (refreshBtn) {
                refreshBtn.click();
            }
        } else {
            // For other tabs, try to find and click any refresh button
            const refreshBtn = activeTabContent.querySelector('button[id*="refresh"], .refresh-btn, [data-action="refresh"]');
            if (refreshBtn) {
                refreshBtn.click();
            } else {
                console.log(`No specific refresh handler found for tab: ${currentTab}`);
            }
        }

        console.log(`Tab ${currentTab} refreshed successfully`);
    } catch (error) {
        console.error('Error refreshing current tab:', error);
    }
}

/**
 * Refresh system information across all relevant tabs
 */
async function refreshSystemInformation() {
    console.log('Refreshing system information...');

    try {
        // Show global refresh indicator
        const refreshIndicator = document.createElement('div');
        refreshIndicator.className = 'global-refresh-indicator';
        refreshIndicator.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Refreshing System Information...';
        refreshIndicator.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--primary-color);
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideDown 0.3s ease-out;
        `;

        // Add animation keyframes if not already present
        if (!document.querySelector('#refresh-animations')) {
            const style = document.createElement('style');
            style.id = 'refresh-animations';
            style.textContent = `
                @keyframes slideDown {
                    from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(refreshIndicator);

        // Remove indicator after 3 seconds
        setTimeout(() => {
            if (refreshIndicator.parentNode) {
                refreshIndicator.remove();
            }
        }, 3000);

        // Refresh system info tab if it exists
        const systemInfoTab = document.getElementById('tab-system-info') || document.getElementById('tab-folder-system-info');
        if (systemInfoTab) {
            if (window.loadSystemInfo && typeof window.loadSystemInfo === 'function') {
                await window.loadSystemInfo(systemInfoTab);
            }
        }

        // Refresh networking tab if it exists
        const networkingTab = document.getElementById('tab-networking') || document.getElementById('tab-folder-networking');
        if (networkingTab) {
            if (window.loadNetworkingInfo && typeof window.loadNetworkingInfo === 'function') {
                await window.loadNetworkingInfo(networkingTab);
            }
        }

        console.log('System information refreshed successfully');
    } catch (error) {
        console.error('Error refreshing system information:', error);
    }
}

/**
 * Load custom keyboard shortcuts from settings
 */
async function loadCustomShortcuts() {
    try {
        if (window.electronAPI) {
            const savedShortcuts = await window.electronAPI.getSetting('keyboardShortcuts', DEFAULT_SHORTCUTS);
            currentShortcuts = { ...DEFAULT_SHORTCUTS, ...savedShortcuts };
        }
    } catch (error) {
        console.error('Error loading custom shortcuts:', error);
        currentShortcuts = { ...DEFAULT_SHORTCUTS };
    }
}

/**
 * Load keyboard shortcuts into the settings UI
 */
async function loadKeyboardShortcutsSettings() {
    try {
        if (window.electronAPI) {
            const savedShortcuts = await window.electronAPI.getSetting('keyboardShortcuts', DEFAULT_SHORTCUTS);

            // Update input fields with saved shortcuts
            Object.keys(DEFAULT_SHORTCUTS).forEach(key => {
                const input = document.getElementById(`shortcut-${key}`);
                if (input) {
                    input.value = savedShortcuts[key] || DEFAULT_SHORTCUTS[key];
                }
            });

            // Initialize shortcut input listeners
            initShortcutInputs();
        }
    } catch (error) {
        console.error('Error loading keyboard shortcuts settings:', error);
    }
}

/**
 * Initialize shortcut input event listeners
 */
function initShortcutInputs() {
    Object.keys(DEFAULT_SHORTCUTS).forEach(key => {
        const input = document.getElementById(`shortcut-${key}`);
        if (input) {
            input.addEventListener('focus', () => startRecordingShortcut(input, key));
            input.addEventListener('blur', () => stopRecordingShortcut(input));
        }
    });
}

/**
 * Start recording a new keyboard shortcut
 */
function startRecordingShortcut(input, shortcutKey) {
    input.classList.add('recording');
    input.value = 'Press keys...';

    const recordKeydown = (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Build shortcut string
        const parts = [];
        if (e.ctrlKey) parts.push('Ctrl');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');
        if (e.metaKey) parts.push('Meta');

        // Add the main key
        let key = e.key;
        if (key === ' ') key = 'Space';
        else if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') {
            return; // Don't record modifier-only shortcuts
        }

        parts.push(key);
        const shortcutString = parts.join('+');

        // Check for conflicts
        const conflict = checkShortcutConflict(shortcutString, shortcutKey);
        if (conflict) {
            input.classList.add('shortcut-conflict');
            input.value = `${shortcutString} (conflicts with ${conflict})`;
        } else {
            input.classList.remove('shortcut-conflict');
            input.value = shortcutString;
        }

        // Remove event listener
        document.removeEventListener('keydown', recordKeydown, true);
        input.classList.remove('recording');
    };

    document.addEventListener('keydown', recordKeydown, true);
}

/**
 * Stop recording a keyboard shortcut
 */
function stopRecordingShortcut(input) {
    input.classList.remove('recording');
    if (input.value === 'Press keys...') {
        // Restore original value if no key was pressed
        const shortcutKey = input.id.replace('shortcut-', '');
        input.value = currentShortcuts[shortcutKey] || DEFAULT_SHORTCUTS[shortcutKey];
    }
}

/**
 * Check if a shortcut conflicts with existing shortcuts
 */
function checkShortcutConflict(shortcutString, excludeKey) {
    for (const [key, value] of Object.entries(currentShortcuts)) {
        if (key !== excludeKey && value === shortcutString) {
            return key.replace('-', ' ');
        }
    }
    return null;
}

/**
 * Save keyboard shortcuts to settings
 */
async function saveKeyboardShortcuts() {
    try {
        if (window.electronAPI) {
            const shortcuts = {};

            Object.keys(DEFAULT_SHORTCUTS).forEach(key => {
                const input = document.getElementById(`shortcut-${key}`);
                if (input && input.value && !input.classList.contains('shortcut-conflict')) {
                    shortcuts[key] = input.value;
                }
            });

            await window.electronAPI.setSetting('keyboardShortcuts', shortcuts);
            currentShortcuts = { ...DEFAULT_SHORTCUTS, ...shortcuts };

            console.log('Keyboard shortcuts saved:', shortcuts);
        }
    } catch (error) {
        console.error('Error saving keyboard shortcuts:', error);
    }
}

/**
 * Reset a single shortcut to default
 */
function resetShortcut(shortcutKey) {
    const input = document.getElementById(`shortcut-${shortcutKey}`);
    if (input) {
        input.value = DEFAULT_SHORTCUTS[shortcutKey];
        input.classList.remove('shortcut-conflict');
    }
}

/**
 * Reset all shortcuts to defaults
 */
function resetAllShortcuts() {
    if (confirm('Are you sure you want to reset all keyboard shortcuts to their defaults?')) {
        Object.keys(DEFAULT_SHORTCUTS).forEach(key => {
            resetShortcut(key);
        });
    }
}

/**
 * Export shortcuts to a JSON file
 */
async function exportShortcuts() {
    try {
        const shortcuts = {};
        Object.keys(DEFAULT_SHORTCUTS).forEach(key => {
            const input = document.getElementById(`shortcut-${key}`);
            if (input) {
                shortcuts[key] = input.value;
            }
        });

        const dataStr = JSON.stringify(shortcuts, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'wintool-shortcuts.json';
        link.click();

        console.log('Shortcuts exported successfully');
    } catch (error) {
        console.error('Error exporting shortcuts:', error);
    }
}

/**
 * Import shortcuts from a JSON file
 */
function importShortcuts() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const shortcuts = JSON.parse(e.target.result);

                    // Validate and apply shortcuts
                    Object.keys(DEFAULT_SHORTCUTS).forEach(key => {
                        if (shortcuts[key]) {
                            const input = document.getElementById(`shortcut-${key}`);
                            if (input) {
                                input.value = shortcuts[key];
                            }
                        }
                    });

                    console.log('Shortcuts imported successfully');
                } catch (error) {
                    console.error('Error importing shortcuts:', error);
                    alert('Error importing shortcuts: Invalid file format');
                }
            };
            reader.readAsText(file);
        }
    };

    input.click();
}

/**
 * Show notification to user
 */
function showNotification(message, type = 'info') {
    // Create notification container if it doesn't exist
    let container = document.querySelector('.notification-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    
    // Set icon based on type
    let icon = 'fas fa-info-circle';
    let bgColor = 'var(--primary-color)';
    
    switch (type) {
        case 'success':
            icon = 'fas fa-check-circle';
            bgColor = '#10b981';
            break;
        case 'error':
            icon = 'fas fa-exclamation-circle';
            bgColor = '#ef4444';
            break;
        case 'warning':
            icon = 'fas fa-exclamation-triangle';
            bgColor = '#f59e0b';
            break;
        default:
            icon = 'fas fa-info-circle';
            bgColor = 'var(--primary-color)';
    }

    notification.style.cssText = `
        background: ${bgColor};
        color: white;
        padding: 12px 16px;
        border-radius: 6px;
        margin-bottom: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        max-width: 350px;
        pointer-events: auto;
        transform: translateX(100%);
        transition: transform 0.3s ease-out;
    `;

    notification.innerHTML = `
        <i class="${icon}"></i>
        <span>${message}</span>
    `;

    container.appendChild(notification);

    // Show notification with animation
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    // Hide and remove notification after 4 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
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
window.refreshCurrentTab = refreshCurrentTab;
window.refreshSystemInformation = refreshSystemInformation;
window.resetShortcut = resetShortcut;
window.resetAllShortcuts = resetAllShortcuts;
window.exportShortcuts = exportShortcuts;
window.importShortcuts = importShortcuts;
window.showNotification = showNotification;
window.cancelSettings = cancelSettings;


console.log('WinTool app.js loaded');
