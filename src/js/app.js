/**
 * WinTool - Main Application JavaScript
 *
 * This file contains all the client-side logic for WinTool.
 * It's designed to be easy to understand and extend.
 */

// Global state
let currentTab = 'welcome';
let tabs = new Map();
let hiddenTabs = [];
let tabLoader = null;
let rainbowAnimationId = null;
window.tabEventManager = new EventTarget(); // For plugin communication

const DEFAULT_TAB_ORDER = [
    'tweaks',
    'system-info',
    'processes',
    'services',
    'networking',
    'cleanup',
    'packages',
    'system-utilities',
    'environment-variables',
    'event-viewer',
    'script-editor',
    'windows-unattend',
    'about'
];

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
    initContextMenu();
    initPluginInstallButton();
    initOpenPluginsDirButton();

    // Update splash progress
    updateSplashProgress('Loading settings...', 20);

    // Load and apply saved settings
    await loadAndApplyStartupSettings();

    // Continue with normal startup
    await continueNormalStartup();
    
    // Load help modal content
    fetch('help-modal.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('help-modal-container').innerHTML = data;
        });
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

    // Register the welcome tab
    tabs.set('welcome', {
        name: 'Welcome',
        icon: 'fas fa-home',
        content: document.getElementById('tab-welcome').innerHTML
    });
    // Register the plugins tab
    tabs.set('plugins', {
        name: 'Plugins',
        icon: 'fas fa-puzzle-piece',
        content: document.getElementById('tab-plugins').innerHTML
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
    'show-help': 'F1',
    'command-palette': 'Ctrl+K',
    'focus-search': 'Ctrl+F',
    'refresh-tab': 'Ctrl+R',
    'refresh-system': 'F5',
    'open-settings': 'Ctrl+S',
    'close-modal': 'Escape',
    'quit-app': 'Ctrl+Q'
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
        if (matchesShortcut(e, currentShortcuts['show-help'])) {
            e.preventDefault();
            showHelpModal();
        } else if (matchesShortcut(e, currentShortcuts['command-palette'])) {
            e.preventDefault();
            showCommandPalette();
        } else if (matchesShortcut(e, currentShortcuts['focus-search'])) {
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
        // Note: Loading tab order is now handled in the tab loader's onComplete callback
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
        
        // If no custom order is saved, exit. The default order from tab-loader will be used.
        if (!savedOrder || savedOrder.length === 0) {
            console.log('No saved drag-and-drop tab order found. Using default.');
            return;
        }

        console.log('Applying saved drag-and-drop tab order.');
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
    const previousTabId = currentTab;
    if (previousTabId === tabName) return; // Don't do anything if clicking the same tab

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

    // Dispatch the event for plugins
    window.tabEventManager.dispatchEvent(new CustomEvent('tab-switched', {
        detail: {
            newTabId: currentTab,
            previousTabId: previousTabId
        }
    }));

    console.log(`Successfully switched to tab: ${tabName}`);
}

// addNewTab function removed - feature disabled

// createNewTab function removed - feature disabled

/**
 * Initialize context menus for tabs and sidebar
 */
function initContextMenu() {
    const tabContextMenu = document.getElementById('tab-context-menu');
    const sidebarContextMenu = document.getElementById('sidebar-context-menu');
    const tabList = document.getElementById('tab-list');
    const sidebar = document.querySelector('.sidebar');

    let activeTabId = null;

    // Show context menu for tabs
    tabList.addEventListener('contextmenu', (e) => {
        const targetTab = e.target.closest('.tab-item');
        if (targetTab) {
            e.preventDefault();
            activeTabId = targetTab.getAttribute('data-tab');

            // Don't show menu for "Welcome" tab
            if (activeTabId === 'welcome') return;

            tabContextMenu.style.top = `${e.clientY}px`;
            tabContextMenu.style.left = `${e.clientX}px`;
            tabContextMenu.style.display = 'block';
            sidebarContextMenu.style.display = 'none';
        }
    });

    // Show context menu for sidebar (to unhide tabs)
    sidebar.addEventListener('contextmenu', (e) => {
        // Only show if clicking outside a tab item
        if (!e.target.closest('.tab-item')) {
            e.preventDefault();
            updateHiddenTabsMenu();
            sidebarContextMenu.style.top = `${e.clientY}px`;
            sidebarContextMenu.style.left = `${e.clientX}px`;
            sidebarContextMenu.style.display = 'block';
            tabContextMenu.style.display = 'none';
        }
    });

    // Hide menu when clicking elsewhere
    document.addEventListener('click', () => {
        tabContextMenu.style.display = 'none';
        sidebarContextMenu.style.display = 'none';
    });

    // Handle "Hide Tab" action
    document.getElementById('context-menu-hide-tab').addEventListener('click', () => {
        if (activeTabId) {
            hideTab(activeTabId);
        }
    });

    // Handle "Show Tab" action using event delegation
    document.getElementById('hidden-tabs-list').addEventListener('click', (e) => {
        const target = e.target.closest('.context-menu-item');
        if (target && target.dataset.tab) {
            showTab(target.dataset.tab);
        }
    });
}

/**
 * Hide a tab and save the state
 */
async function hideTab(tabId) {
    if (hiddenTabs.includes(tabId)) return;

    const tabItem = document.querySelector(`.tab-item[data-tab="${tabId}"]`);
    if (tabItem) {
        tabItem.classList.add('is-hidden');
        hiddenTabs.push(tabId);
        await window.electronAPI.setSetting('hiddenTabs', hiddenTabs);

        // If the hidden tab was active, switch to the welcome tab
        if (currentTab === tabId) {
            switchToTab('welcome');
        }
        showNotification(`Tab "${tabItem.textContent.trim()}" hidden.`, 'info');
    }
}

/**
 * Show a tab and save the state
 */
async function showTab(tabId) {
    const index = hiddenTabs.indexOf(tabId);
    if (index === -1) return;

    const tabItem = document.querySelector(`.tab-item[data-tab="${tabId}"]`);
    if (tabItem) {
        tabItem.classList.remove('is-hidden');
        hiddenTabs.splice(index, 1);
        await window.electronAPI.setSetting('hiddenTabs', hiddenTabs);
        showNotification(`Tab "${tabItem.textContent.trim()}" restored.`, 'success');
    }
}

/**
 * Update the list of hidden tabs in the context menu
 */
function updateHiddenTabsMenu() {
    const hiddenTabsList = document.getElementById('hidden-tabs-list');
    const showTabsSubmenu = document.getElementById('context-menu-show-tabs');
    hiddenTabsList.innerHTML = ''; // Clear existing items

    if (hiddenTabs.length === 0) {
        showTabsSubmenu.style.display = 'none';
    } else {
        showTabsSubmenu.style.display = 'flex';
        hiddenTabs.forEach(tabId => {
            const originalTab = document.querySelector(`.tab-item[data-tab="${tabId}"]`);
            if (originalTab) {
                const tabName = originalTab.querySelector('span').textContent;
                const tabIcon = originalTab.querySelector('i').className;

                const li = document.createElement('li');
                li.className = 'context-menu-item';
                li.dataset.tab = tabId;
                li.innerHTML = `<i class="${tabIcon}"></i> ${tabName}`;
                hiddenTabsList.appendChild(li);
            }
        });
    }
}

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

            tabLoader.setCompleteCallback(async (loadedTabs) => {
                // Load saved tab order now that all tabs are in the DOM
                await loadTabOrder();
                // Apply hidden tabs state
                await applyHiddenTabs();
                // Render plugin management cards
                renderPluginCards();
                // Restore last active tab after all tabs are loaded
                await restoreLastActiveTab();

                // Initialize command palette after all tabs and plugins are loaded
                registerDefaultCommands(loadedTabs);

                // Fetch all services and register commands for them
                try {
                    const services = await window.electronAPI.getServices();
                    registerServiceControlCommands(services);
                } catch (error) {
                    console.error("Failed to fetch and register service commands:", error);
                }

                initCommandPalette();
                hideSplashScreen();
            });

            await tabLoader.init(DEFAULT_TAB_ORDER);
        } else {
            // If no tab loader, restore last active tab and hide splash screen after a delay
            await restoreLastActiveTab();
            
            // Initialize command palette after all tabs and plugins are loaded
            registerDefaultCommands(new Map()); // Pass an empty map since no dynamic tabs were loaded
            initCommandPalette();

            updateSplashProgress('Ready!', 100);
            setTimeout(hideSplashScreen, 500);
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
            // Load theme
            const theme = await window.electronAPI.getSetting('theme', 'classic-dark');
            const themeSelector = document.getElementById('theme-selector');
            if (themeSelector) {
                themeSelector.value = theme;
            }

            // Load primary color
            const primaryColor = await window.electronAPI.getSetting('primaryColor', '#ff9800');
            const colorPicker = document.getElementById('primary-color-picker');
            const colorPreview = document.getElementById('primary-color-preview');
            if (colorPicker && colorPreview) {
                colorPicker.value = primaryColor;
                colorPreview.textContent = primaryColor;
            }

            // Load rainbow mode settings
            const rainbowMode = await window.electronAPI.getSetting('rainbowMode', false);
            const rainbowModeCheckbox = document.getElementById('rainbow-mode-checkbox');
            if (rainbowModeCheckbox) {
                rainbowModeCheckbox.checked = rainbowMode;
            }

            const rainbowSpeed = await window.electronAPI.getSetting('rainbowSpeed', 5);
            const rainbowSpeedSlider = document.getElementById('rainbow-speed-slider');
            const rainbowSpeedValue = document.getElementById('rainbow-speed-value');
            if (rainbowSpeedSlider && rainbowSpeedValue) {
                rainbowSpeedSlider.value = rainbowSpeed;
                rainbowSpeedValue.textContent = `${rainbowSpeed}s`;
            }
            toggleRainbowSpeedContainer(rainbowMode);

            // Load transparency
            const transparency = await window.electronAPI.getSetting('transparency', 1);
            const transparencySlider = document.getElementById('transparency-slider');
            const transparencyValue = document.getElementById('transparency-value');
            if (transparencySlider && transparencyValue) {
                transparencySlider.value = transparency;
                transparencyValue.textContent = `${Math.round(transparency * 100)}%`;
            }

            // Remove window size loading and applying

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

            const elevationPreference = await window.electronAPI.getSetting('elevationChoice', 'ask');
            const elevationSelector = document.getElementById('elevation-preference');
            if (elevationSelector) {
                elevationSelector.value = elevationPreference;
            }


            // Load advanced settings
            const enableDevTools = await window.electronAPI.getSetting('enableDevTools', true);
            const enableDevToolsCheckbox = document.getElementById('enable-dev-tools');
            if (enableDevToolsCheckbox) {
                enableDevToolsCheckbox.checked = enableDevTools;
            }

            const clearPluginCache = await window.electronAPI.getSetting('clearPluginCache', false);
            const clearPluginCacheCheckbox = document.getElementById('clear-plugin-cache');
            if (clearPluginCacheCheckbox) {
                clearPluginCacheCheckbox.checked = clearPluginCache;
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

    // Initialize theme selector
    const themeSelector = document.getElementById('theme-selector');
    if (themeSelector) {
        themeSelector.addEventListener('change', async (e) => {
            const selectedTheme = e.target.value;
            await applyTheme(selectedTheme);
            const customThemeCreator = document.getElementById('custom-theme-creator');
            if (customThemeCreator) {
                customThemeCreator.style.display = selectedTheme === 'custom' ? 'block' : 'none';
            }
        });
    }

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

    // Initialize transparency slider
    const transparencySlider = document.getElementById('transparency-slider');
    const transparencyValue = document.getElementById('transparency-value');
    if (transparencySlider && transparencyValue) {
        transparencySlider.addEventListener('input', (e) => {
            const value = e.target.value;
            transparencyValue.textContent = `${Math.round(value * 100)}%`;
            if (window.electronAPI && window.electronAPI.setWindowOpacity) {
                window.electronAPI.setWindowOpacity(parseFloat(value));
            }
        });
    }

    // Initialize rainbow mode controls
    const rainbowModeCheckbox = document.getElementById('rainbow-mode-checkbox');
    if (rainbowModeCheckbox) {
        rainbowModeCheckbox.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            toggleRainbowSpeedContainer(enabled);
            if (enabled) {
                applyRainbowEffect();
            } else {
                removeRainbowEffect();
                // Re-apply the selected primary color
                const primaryColor = document.getElementById('primary-color-picker').value;
                updatePrimaryColorVariables(primaryColor);
            }
        });
    }

    const rainbowSpeedSlider = document.getElementById('rainbow-speed-slider');
    const rainbowSpeedValue = document.getElementById('rainbow-speed-value');
    if (rainbowSpeedSlider && rainbowSpeedValue) {
        rainbowSpeedSlider.addEventListener('input', (e) => {
            const speed = e.target.value;
            rainbowSpeedValue.textContent = `${speed}s`;
            // If rainbow mode is active, re-apply the effect with the new speed
            if (rainbowAnimationId) {
                applyRainbowEffect(speed);
            }
        });
    }
}

function toggleRainbowSpeedContainer(enabled) {
    const container = document.getElementById('rainbow-speed-container');
    if (container) {
        container.style.display = enabled ? 'block' : 'none';
    }
}

/**
 * Save settings
 */
async function saveSettings() {
    try {
        if (window.electronAPI) {
            // Save theme
            const theme = document.getElementById('theme-selector')?.value || 'classic-dark';
            await window.electronAPI.setSetting('theme', theme);

            // Save primary color
            const primaryColor = document.getElementById('primary-color-picker')?.value || '#ff9800';
            await window.electronAPI.setSetting('primaryColor', primaryColor);

            // Save rainbow mode settings
            const rainbowMode = document.getElementById('rainbow-mode-checkbox')?.checked || false;
            await window.electronAPI.setSetting('rainbowMode', rainbowMode);

            // Get and validate rainbow speed
            let rainbowSpeed = parseInt(document.getElementById('rainbow-speed-slider')?.value, 10);
            if (isNaN(rainbowSpeed) || rainbowSpeed < 1 || rainbowSpeed > 10) {
                rainbowSpeed = 5; // Default to 5 if invalid
            }
            await window.electronAPI.setSetting('rainbowSpeed', rainbowSpeed);

            // Save transparency
            const transparency = document.getElementById('transparency-slider')?.value || 1;
            await window.electronAPI.setSetting('transparency', parseFloat(transparency));

            // Save behavior settings
            const rememberLastTab = document.getElementById('remember-last-tab')?.checked || false;
            await window.electronAPI.setSetting('rememberLastTab', rememberLastTab);

            const autoRefreshData = document.getElementById('auto-refresh-data')?.checked || true;
            await window.electronAPI.setSetting('autoRefreshData', autoRefreshData);

            const elevationPreference = document.getElementById('elevation-preference')?.value || 'ask';
            await window.electronAPI.setSetting('elevationChoice', elevationPreference);


            // Save advanced settings
            const enableDevTools = document.getElementById('enable-dev-tools')?.checked || true;
            await window.electronAPI.setSetting('enableDevTools', enableDevTools);

            const clearPluginCache = document.getElementById('clear-plugin-cache')?.checked || false;
            await window.electronAPI.setSetting('clearPluginCache', clearPluginCache);

            // Save keyboard shortcuts
            await saveKeyboardShortcuts();

            // Apply settings immediately
            applySettings();

            // Close modal after successful save
            closeModal('settings-modal');
            
            showNotification('Settings saved successfully!', 'success');
        } else {
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

/**
 * Reset settings to default values
 */
async function resetSettings() {
    if (!confirm('Are you sure you want to reset all application settings? This will restart the application and cannot be undone.')) {
        return;
    }

    try {
        if (window.electronAPI) {
            // Call the main process to clear all settings
            const success = await window.electronAPI.clearAllSettings();

            if (success) {
                showNotification('Settings have been reset. The application will now restart.', 'success');
                // Give the notification time to show before restarting
                setTimeout(async () => {
                    await window.electronAPI.restartApplication();
                }, 3000);
            } else {
                showNotification('Failed to reset settings. Please try again.', 'error');
            }
        }
    } catch (error) {
        console.error('Error resetting settings:', error);
        showNotification(`An error occurred: ${error.message}`, 'error');
    }
}

/**
 * Load and apply settings on startup
 */
async function loadAndApplyStartupSettings() {
    try {
        if (window.electronAPI) {
            const theme = await window.electronAPI.getSetting('theme', 'classic-dark');
            if (theme === 'custom') {
                await loadCustomTheme();
            }
            await applyTheme(theme);

            const rainbowMode = await window.electronAPI.getSetting('rainbowMode', false);
            if (rainbowMode) {
                const rainbowSpeed = await window.electronAPI.getSetting('rainbowSpeed', 5);
                applyRainbowEffect(rainbowSpeed);
            } else {
                // Load and apply primary color with all related variables
                const primaryColor = await window.electronAPI.getSetting('primaryColor', '#ff9800');
                updatePrimaryColorVariables(primaryColor);
            }

            // Load and apply transparency
            const transparency = await window.electronAPI.getSetting('transparency', 1);
            if (window.electronAPI && window.electronAPI.setWindowOpacity) {
                window.electronAPI.setWindowOpacity(transparency);
            }

            // Note: Tab restoration is now handled after all tabs are loaded
            // See restoreLastActiveTab() function which is called from startTabRestorationProcess()

            // Load tab order after tabs are loaded
            await loadTabOrder();

            // Load hidden tabs setting
            hiddenTabs = await window.electronAPI.getSetting('hiddenTabs', []);

            console.log('Startup settings loaded and applied');
        }
    } catch (error) {
        console.error('Error loading startup settings:', error);
    }
}

/**
* Apply the hidden status to tabs on startup
*/
function applyHiddenTabs() {
   if (!hiddenTabs || hiddenTabs.length === 0) return;

   hiddenTabs.forEach(tabId => {
       const tabItem = document.querySelector(`.tab-item[data-tab="${tabId}"]`);
       if (tabItem) {
           tabItem.classList.add('is-hidden');
       }
   });
   console.log('Hidden tabs applied:', hiddenTabs);
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
    const rainbowMode = document.getElementById('rainbow-mode-checkbox')?.checked || false;
    if (rainbowMode) {
        const rainbowSpeed = document.getElementById('rainbow-speed-slider')?.value || 5;
        applyRainbowEffect(rainbowSpeed);
    } else {
        removeRainbowEffect();
        // Apply primary color and related variables
        const primaryColor = document.getElementById('primary-color-picker')?.value || '#ff9800';
        updatePrimaryColorVariables(primaryColor);
    }

    // Apply transparency
    const transparency = document.getElementById('transparency-slider')?.value || 1;
    if (window.electronAPI && window.electronAPI.setWindowOpacity) {
        window.electronAPI.setWindowOpacity(parseFloat(transparency));
    }

    // Remove window size apply

    // Note: Other settings like window size, dev tools, etc. may require app restart
    // This could be enhanced to show a notification about restart requirements
}

const THEMES = {
    'classic-dark': {
        '--primary-color': '#ff9800',
        '--primary-dark': '#f57c00',
        '--primary-darker': '#e65100',
        '--primary-rgb': '255, 152, 0',
        '--background-dark': '#0a0a0c',
        '--background-light': '#111113',
        '--background-card': '#1a1a1c',
        '--border-color': '#333333',
        '--hover-color': '#23232a',
        '--background-content': '#0a0a0c'
    },
    'modern-gray': {
        '--primary-color': '#ff9800',
        '--primary-dark': '#2980b9',
        '--primary-darker': '#2c3e50',
        '--primary-rgb': '52, 152, 219',
        '--background-dark': '#1c1c1e',
        '--background-light': '#2c2c2e',
        '--background-card': '#3a3a3c',
        '--border-color': '#444444',
        '--hover-color': '#4f4f52',
        '--background-content': '#1c1c1e'
    },
    'custom': {}
};

async function applyTheme(themeName) {
    const theme = THEMES[themeName];
    if (!theme) return;

    if (themeName === 'custom') {
        await loadCustomTheme();
    } else {
        for (const [key, value] of Object.entries(theme)) {
            document.documentElement.style.setProperty(key, value);
        }
    }

    // Update color picker
    const colorPicker = document.getElementById('primary-color-picker');
    const colorPreview = document.getElementById('primary-color-preview');
    if (colorPicker && colorPreview) {
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color');
        colorPicker.value = primaryColor.trim();
        colorPreview.textContent = primaryColor.trim();
    }
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

function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}


function applyRainbowEffect(speed = 5) {
    if (rainbowAnimationId) {
        cancelAnimationFrame(rainbowAnimationId);
    }

    let hue = 0;
    const cycleDuration = speed * 1000; // speed in seconds
    let startTime = null;

    function updateRainbowColors(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsedTime = timestamp - startTime;
        
        hue = (elapsedTime / cycleDuration * 360) % 360;

        const colorHex = hslToHex(hue, 100, 50);
        updatePrimaryColorVariables(colorHex);
        
        rainbowAnimationId = requestAnimationFrame(updateRainbowColors);
    }

    rainbowAnimationId = requestAnimationFrame(updateRainbowColors);
}

function removeRainbowEffect() {
    if (rainbowAnimationId) {
        cancelAnimationFrame(rainbowAnimationId);
        rainbowAnimationId = null;
    }
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

    // Listen for notification requests from the main process (forwarded from plugins)
    if (window.electronAPI && window.electronAPI.onDisplayNotification) {
        window.electronAPI.onDisplayNotification(({ title, body, type }) => {
            showNotification(body, type); // The title is often unused in our simple notification UI
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
window.showHelpModal = showHelpModal;
window.showCommandPalette = showCommandPalette;
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
window.openThemeCreator = openThemeCreator;
window.saveCustomTheme = saveCustomTheme;
window.importTheme = importTheme;
window.exportTheme = exportTheme;
window.resetCustomTheme = resetCustomTheme;

function openThemeCreator() {
    const modal = document.getElementById('theme-creator-modal');
    if (modal) {
        // Load current custom theme settings into the creator
        const customTheme = THEMES['custom'];
        document.getElementById('theme-name-input').value = customTheme.name || 'My Custom Theme';
        document.getElementById('theme-primary-color').value = customTheme['--primary-color'] || '#ff9800';
        document.getElementById('theme-background-dark').value = customTheme['--background-dark'] || '#1c1c1e';
        document.getElementById('theme-background-light').value = customTheme['--background-light'] || '#2c2c2e';
        document.getElementById('theme-background-card').value = customTheme['--background-card'] || '#3a3a3c';
        document.getElementById('theme-border-color').value = customTheme['--border-color'] || '#444444';
        document.getElementById('theme-hover-color').value = customTheme['--hover-color'] || '#4f4f52';
        document.getElementById('theme-background-content').value = customTheme['--background-content'] || '#1c1c1e';
        modal.style.display = 'flex';
    }
}

async function saveCustomTheme() {
    const themeName = document.getElementById('theme-name-input').value;
    const theme = {
        name: themeName,
        '--primary-color': document.getElementById('theme-primary-color').value,
        '--background-dark': document.getElementById('theme-background-dark').value,
        '--background-light': document.getElementById('theme-background-light').value,
        '--background-card': document.getElementById('theme-background-card').value,
        '--border-color': document.getElementById('theme-border-color').value,
        '--hover-color': document.getElementById('theme-hover-color').value,
        '--background-content': document.getElementById('theme-background-content').value
    };

    THEMES['custom'] = theme;
    await window.electronAPI.setSetting('customTheme', theme);
    await applyTheme('custom');
    closeModal('theme-creator-modal');
    showNotification('Custom theme saved!', 'success');
    // Manually update the primary color in the settings UI
    const primaryColorPicker = document.getElementById('primary-color-picker');
    const primaryColorPreview = document.getElementById('primary-color-preview');
    if (primaryColorPicker && primaryColorPreview) {
        primaryColorPicker.value = theme['--primary-color'];
        primaryColorPreview.textContent = theme['--primary-color'];
    }
}

async function loadCustomTheme() {
    const customTheme = await window.electronAPI.getSetting('customTheme', {});
    THEMES['custom'] = customTheme;
    if (Object.keys(customTheme).length > 0) {
        for (const [key, value] of Object.entries(customTheme)) {
            if (key !== 'name') {
                document.documentElement.style.setProperty(key, value);
            }
        }
    }
}

function importTheme() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const theme = JSON.parse(e.target.result);
                    THEMES['custom'] = theme;
                    await window.electronAPI.setSetting('customTheme', theme);
                    await applyTheme('custom');
                    document.getElementById('theme-selector').value = 'custom';
                    showNotification('Theme imported successfully!', 'success');
                } catch (error) {
                    showNotification('Error importing theme: Invalid file format', 'error');
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

function exportTheme() {
    const currentThemeName = document.getElementById('theme-selector').value;
    if (currentThemeName === 'custom') {
        const dataStr = JSON.stringify(THEMES['custom'], null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'wintool-custom-theme.json';
        link.click();
    } else {
        showNotification('Please select the custom theme to export.', 'warning');
    }
}

function resetCustomTheme() {
    document.getElementById('theme-name-input').value = 'My Custom Theme';
    document.getElementById('theme-primary-color').value = '#ff9800';
    document.getElementById('theme-background-dark').value = '#1c1c1e';
    document.getElementById('theme-background-light').value = '#2c2c2e';
    document.getElementById('theme-background-card').value = '#3a3a3c';
    document.getElementById('theme-border-color').value = '#444444';
    document.getElementById('theme-hover-color').value = '#4f4f52';
    document.getElementById('theme-background-content').value = '#1c1c1e';
    showNotification('Custom theme colors reset. Click "Save Theme" to apply.', 'success');
}

// Command Palette Implementation
const commandRegistry = [];
let activeCommandIndex = -1;

function registerCommand(command) {
    commandRegistry.push(command);
}

function initCommandPalette() {
    const input = document.getElementById('command-palette-input');
    const resultsList = document.getElementById('command-palette-results');
    const modal = document.getElementById('command-palette-modal');

    if (!input || !resultsList || !modal) return;

    input.addEventListener('input', () => {
        renderCommands(input.value);
    });

    input.addEventListener('keydown', (e) => {
        const items = resultsList.querySelectorAll('.command-palette-item');
        if (items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeCommandIndex = (activeCommandIndex + 1) % items.length;
            updateActiveCommand();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeCommandIndex = (activeCommandIndex - 1 + items.length) % items.length;
            updateActiveCommand();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const activeItem = resultsList.querySelector('.command-palette-item.active');
            if (activeItem) {
                const commandId = activeItem.dataset.commandId;
                executeCommand(commandId);
            }
        } else if (e.key === 'Escape') {
            closeCommandPalette();
        }
    });

    resultsList.addEventListener('click', (e) => {
        const item = e.target.closest('.command-palette-item');
        if (item) {
            const commandId = item.dataset.commandId;
            executeCommand(commandId);
        }
    });
}

function showCommandPalette() {
    const modal = document.getElementById('command-palette-modal');
    const input = document.getElementById('command-palette-input');
    if (modal && input) {
        modal.style.display = 'flex';
        input.value = '';
        renderCommands('');
        input.focus();
    }
}

function closeCommandPalette() {
    const modal = document.getElementById('command-palette-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function renderCommands(filter = '') {
    const resultsList = document.getElementById('command-palette-results');
    if (!resultsList) return;

    resultsList.innerHTML = '';
    const lowerCaseFilter = filter.toLowerCase();

    const filteredCommands = commandRegistry.filter(cmd =>
        cmd.title.toLowerCase().includes(lowerCaseFilter) ||
        cmd.category.toLowerCase().includes(lowerCaseFilter)
    );

    filteredCommands.forEach(cmd => {
        const item = document.createElement('li');
        item.className = 'command-palette-item';
        item.dataset.commandId = cmd.id;
        item.innerHTML = `
            <i class="command-palette-item-icon ${cmd.icon}"></i>
            <div class="command-palette-item-text">
                <div class="command-palette-item-title">${cmd.title}</div>
                <div class="command-palette-item-category">${cmd.category}</div>
            </div>
        `;
        resultsList.appendChild(item);
    });

    activeCommandIndex = 0;
    updateActiveCommand();
}

function updateActiveCommand() {
    const resultsList = document.getElementById('command-palette-results');
    if (!resultsList) return;

    const items = resultsList.querySelectorAll('.command-palette-item');
    items.forEach((item, index) => {
        if (index === activeCommandIndex) {
            item.classList.add('active');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('active');
        }
    });
}

function executeCommand(commandId) {
    const command = commandRegistry.find(cmd => cmd.id === commandId);
    if (command && command.action) {
        command.action();
        closeCommandPalette();
    }
}

function registerDefaultCommands(loadedTabs) {
    // Combine the statically defined tabs (like Welcome) with the dynamically loaded ones
    const allTabs = new Map([...tabs, ...loadedTabs]);

    // Tab navigation commands
    allTabs.forEach((tab, id) => {
        // Handle the two different structures for tab objects
        const name = tab.config ? tab.config.name : tab.name;
        const icon = tab.config ? tab.config.icon : tab.icon;

        // Ensure we have a valid name before registering
        if (name) {
            registerCommand({
                id: `navigate-${id}`,
                title: `Go to ${name}`,
                category: 'Navigation',
                icon: icon,
                action: () => switchToTab(id)
            });
        }
    });
    
    // General commands
    registerCommand({
        id: 'show-help',
        title: 'Show Help',
        category: 'Application',
        icon: 'fas fa-question-circle',
        action: showHelpModal
    });
    registerCommand({
        id: 'open-settings',
        title: 'Open Settings',
        category: 'Application',
        icon: 'fas fa-cog',
        action: showSettings
    });

    registerCommand({
        id: 'refresh-tab',
        title: 'Refresh Current Tab',
        category: 'Application',
        icon: 'fas fa-sync-alt',
        action: refreshCurrentTab
    });

    // System commands
    registerCommand({
        id: 'open-cmd',
        title: 'Open Command Prompt',
        category: 'System',
        icon: 'fas fa-terminal',
        action: () => window.electronAPI.runCommand('start cmd')
    });

    registerCommand({
        id: 'open-powershell',
        title: 'Open PowerShell',
        category: 'System',
        icon: 'fab fa-windows',
        action: () => window.electronAPI.runCommand('start powershell')
    });

    registerCommand({
        id: 'sfc-scannow',
        title: 'Run SFC Scan',
        category: 'System Repair',
        icon: 'fas fa-first-aid',
        action: () => window.electronAPI.runCommand('sfc /scannow', true)
    });

    registerCommand({
        id: 'dism-cleanup',
        title: 'Run DISM Cleanup',
        category: 'System Repair',
        icon: 'fas fa-medkit',
        action: () => window.electronAPI.runCommand('Dism /Online /Cleanup-Image /RestoreHealth', true)
    });

    registerCommand({
        id: 'open-app-dir',
        title: 'Open App Directory',
        category: 'Application',
        icon: 'fas fa-folder-open',
        action: () => window.electronAPI.openAppDirectory()
    });
    
    // Add more commands here in the future
    
    // Application control
    registerCommand({
        id: 'toggle-dev-tools',
        title: 'Toggle Developer Tools',
        category: 'Application',
        icon: 'fas fa-code',
        action: () => window.electronAPI.toggleDevTools()
    });
    registerCommand({
        id: 'restart-app',
        title: 'Restart Application',
        category: 'Application',
        icon: 'fas fa-redo',
        action: () => window.electronAPI.restartApplication()
    });
    registerCommand({
        id: 'quit-app',
        title: 'Quit Application',
        category: 'Application',
        icon: 'fas fa-power-off',
        action: () => window.electronAPI.quitApp()
    });

    // System Utilities
    registerCommand({
        id: 'launch-resmon',
        title: 'Launch Resource Monitor',
        category: 'System Utilities',
        icon: 'fas fa-chart-line',
        action: () => window.electronAPI.launchSystemUtility('resmon')
    });
    registerCommand({
        id: 'launch-msinfo32',
        title: 'Launch System Information',
        category: 'System Utilities',
        icon: 'fas fa-info-circle',
        action: () => window.electronAPI.launchSystemUtility('msinfo32')
    });
    registerCommand({
        id: 'launch-control-panel',
        title: 'Launch Control Panel',
        category: 'System Utilities',
        icon: 'fas fa-sliders-h',
        action: () => window.electronAPI.launchSystemUtility('control')
    });

    // Plugin Management
     registerCommand({
        id: 'install-plugin',
        title: 'Install Plugin from File...',
        category: 'Plugin Management',
        icon: 'fas fa-plus',
        action: () => {
            const installBtn = document.getElementById('install-plugin-btn');
            if(installBtn) installBtn.click();
        }
    });
    registerCommand({
        id: 'open-plugins-dir',
        title: 'Open Plugins Folder',
        category: 'Plugin Management',
        icon: 'fas fa-folder-open',
        action: () => window.electronAPI.openPluginsDirectory()
    });

    // Folder Shortcuts
    registerCommand({
        id: 'open-temp-folder',
        title: 'Open Temp Folder',
        category: 'Folders',
        icon: 'fas fa-folder',
        action: () => window.electronAPI.openSpecialFolder('temp')
    });
    registerCommand({
        id: 'open-startup-folder',
        title: 'Open Startup Folder',
        category: 'Folders',
        icon: 'fas fa-folder',
        action: () => window.electronAPI.openSpecialFolder('startup')
    });
    registerCommand({
        id: 'open-hosts-folder',
        title: 'Open Hosts File Folder',
        category: 'Folders',
        icon: 'fas fa-folder',
        action: () => window.electronAPI.openSpecialFolder('hosts')
    });

    // Cleanup Actions
    registerCommand({
        id: 'cleanup-temp',
        title: 'Clean Temporary Files',
        category: 'System Cleanup',
        icon: 'fas fa-broom',
        action: () => {
            window.electronAPI.executeCleanup('temp').then(result => {
                showNotification(`Cleaned temporary files. Space freed: ${(result.sizeFreed / 1024 / 1024).toFixed(2)} MB`, 'success');
            }).catch(err => showNotification(`Cleanup failed: ${err.message}`, 'error'));
        }
    });

}

function registerServiceControlCommands(services) {
    if (!services || !Array.isArray(services)) {
        console.warn('Could not register service commands, service list is invalid.');
        return;
    }

    services.forEach(service => {
        const serviceId = service.Name;
        // Use DisplayName for the title, fallback to Name if it's empty
        const serviceName = service.DisplayName || service.Name;
        
        ['start', 'stop', 'restart'].forEach(action => {
            registerCommand({
                id: `${action}-${serviceId}-service`,
                title: `${action.charAt(0).toUpperCase() + action.slice(1)}: ${serviceName}`,
                category: 'Service Control',
                icon: 'fas fa-cogs',
                action: () => {
                    window.electronAPI.controlService(serviceId, action)
                        .then(() => showNotification(`${serviceName} service ${action}ed successfully.`, 'success'))
                        .catch(err => showNotification(`Failed to ${action} ${serviceName}: ${err.message}`, 'error'));
                }
            });
        });
    });
    console.log(`Registered start/stop/restart commands for ${services.length} services.`);
}

function showHelpModal() {
    const modal = document.getElementById('help-modal');
    if (!modal) return;

    const commandList = document.getElementById('help-command-list');
    const searchInput = document.getElementById('help-search-input');
    const commandsPerLoad = 15;
    let serviceCommandsRendered = 0;

    // Use a single event listener for the entire list
    commandList.onclick = function(e) {
        const commandItem = e.target.closest('.help-command-item');
        if (commandItem && commandItem.dataset.commandId) {
            executeCommand(commandItem.dataset.commandId);
            closeModal('help-modal');
        }

        const loadMoreBtn = e.target.closest('.load-more-btn');
        if(loadMoreBtn) {
            loadMoreBtn.onclick(); // Trigger the original onclick handler
        }
    };

    const renderHelpList = (filter = '', loadMore = false) => {
        const lowerCaseFilter = filter.toLowerCase();

        if (!loadMore) {
            commandList.innerHTML = '';
            serviceCommandsRendered = 0;
        }

        const groupedCommands = commandRegistry.reduce((acc, cmd) => {
            if (!acc[cmd.category]) acc[cmd.category] = [];
            acc[cmd.category].push(cmd);
            return acc;
        }, {});

        for (const category in groupedCommands) {
            let categoryDiv = commandList.querySelector(`.help-category[data-category="${category}"]`);
            if (!categoryDiv && !loadMore) {
                categoryDiv = document.createElement('div');
                categoryDiv.className = 'help-category';
                categoryDiv.dataset.category = category;
                categoryDiv.innerHTML = `<h4>${category}</h4>`;
                commandList.appendChild(categoryDiv);
            } else if (!categoryDiv && loadMore) {
                continue;
            }

            const existingLoadMoreBtn = categoryDiv.querySelector('.load-more-btn');
            if (existingLoadMoreBtn) existingLoadMoreBtn.remove();

            const filteredCommands = groupedCommands[category].filter(cmd =>
                cmd.title.toLowerCase().includes(lowerCaseFilter)
            );

            if (category === 'Service Control' && filter === '') {
                const commandsToRender = filteredCommands.slice(serviceCommandsRendered, serviceCommandsRendered + commandsPerLoad);
                
                commandsToRender.forEach(cmd => {
                    const item = document.createElement('div');
                    item.className = 'help-command-item';
                    item.dataset.commandId = cmd.id;
                    item.style.cursor = 'pointer'; // Make it look clickable
                    item.innerHTML = `<i class="${cmd.icon}"></i><span class="help-command-title">${cmd.title}</span>`;
                    categoryDiv.appendChild(item);
                });

                serviceCommandsRendered += commandsToRender.length;

                if (serviceCommandsRendered < filteredCommands.length) {
                    const loadMoreBtn = document.createElement('button');
                    loadMoreBtn.textContent = `Load More (${filteredCommands.length - serviceCommandsRendered} remaining)`;
                    loadMoreBtn.className = 'btn btn-secondary load-more-btn';
                    // The main event handler on the list will now handle this button's click
                    loadMoreBtn.onclick = () => renderHelpList('', true);
                    categoryDiv.appendChild(loadMoreBtn);
                }
            } else {
                 if (!loadMore) {
                    filteredCommands.forEach(cmd => {
                        const item = document.createElement('div');
                        item.className = 'help-command-item';
                        item.dataset.commandId = cmd.id;
                        item.style.cursor = 'pointer'; // Make it look clickable
                        item.innerHTML = `<i class="${cmd.icon}"></i><span class="help-command-title">${cmd.title}</span>`;
                        categoryDiv.appendChild(item);
                    });
                }
            }
             if (categoryDiv && categoryDiv.childElementCount <= 1 && !categoryDiv.querySelector('.load-more-btn')) {
                categoryDiv.remove();
            }
        }
    };
    
    searchInput.oninput = (e) => renderHelpList(e.target.value);

    renderHelpList();
    modal.style.display = 'flex';
}


/**
 * Initialize the install plugin button
 */
function initPluginInstallButton() {
    const installBtn = document.getElementById('install-plugin-btn');
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (window.electronAPI) {
                const result = await window.electronAPI.installPlugin();
                if (result.success) {
                    showNotification(result.message, 'success');
                    // Refresh the plugin list
                    await renderPluginCards();
                } else {
                    showNotification(result.message, 'error');
                }
            }
        });
    }
}

/**
 * Initialize the open plugins directory button
 */
function initOpenPluginsDirButton() {
    const openDirBtn = document.getElementById('open-plugins-dir-btn');
    if (openDirBtn) {
        openDirBtn.addEventListener('click', () => {
            if (window.electronAPI) {
                window.electronAPI.openPluginsDirectory();
            }
        });
    }
}

/**
 * Renders cards for each plugin in the "Plugins" tab.
 */
async function renderPluginCards() {
    const activeContainer = document.getElementById('active-plugins-grid');
    const disabledContainer = document.getElementById('disabled-plugins-grid');

    if (!activeContainer || !disabledContainer) return;

    activeContainer.innerHTML = ''; // Clear existing cards
    disabledContainer.innerHTML = ''; // Clear existing cards

    if (!window.electronAPI) return;

    try {
        const plugins = await window.electronAPI.getAllPlugins();
        const activePlugins = plugins.filter(p => p.enabled);
        const disabledPlugins = plugins.filter(p => !p.enabled);

        if (activePlugins.length === 0) {
            activeContainer.innerHTML = '<p class="empty-plugin-message">No active plugins installed.</p>';
        } else {
            activePlugins.forEach(plugin => {
                const card = document.createElement('div');
                card.className = 'feature-card plugin-card';
                card.innerHTML = `
                    <div class="plugin-card-header">
                        <i class="${plugin.icon}"></i>
                        <h4>${plugin.name}</h4>
                    </div>
                    <p>${plugin.description}</p>
                    <div class="plugin-card-actions">
                        <button class="plugin-action-btn" data-plugin-id="${plugin.id}" data-action="disable" title="Disable Plugin">
                            <i class="fas fa-toggle-off"></i>
                        </button>
                        <button class="plugin-action-btn delete" data-plugin-id="${plugin.id}" data-action="delete" title="Delete Plugin">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                    <div class="plugin-card-footer">
                        <span class="plugin-version">v${plugin.version}</span>
                        <span class="plugin-author">by ${plugin.author}</span>
                    </div>
                `;
                activeContainer.appendChild(card);
            });
        }

        if (disabledPlugins.length === 0) {
            disabledContainer.innerHTML = '<p class="empty-plugin-message">No disabled plugins.</p>';
        } else {
            disabledPlugins.forEach(plugin => {
                const card = document.createElement('div');
                card.className = 'feature-card plugin-card disabled';
                card.innerHTML = `
                     <div class="plugin-card-header">
                        <i class="${plugin.icon}"></i>
                        <h4>${plugin.name} (Disabled)</h4>
                    </div>
                    <p>${plugin.description}</p>
                    <div class="plugin-card-actions">
                        <button class="plugin-action-btn" data-plugin-id="${plugin.id}" data-action="enable" title="Enable Plugin">
                            <i class="fas fa-toggle-on"></i>
                        </button>
                        <button class="plugin-action-btn delete" data-plugin-id="${plugin.id}" data-action="delete" title="Delete Plugin">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                    <div class="plugin-card-footer">
                        <span class="plugin-version">v${plugin.version}</span>
                        <span class="plugin-author">by ${plugin.author}</span>
                    </div>
                `;
                disabledContainer.appendChild(card);
            });
        }

        // Add event listeners for the new buttons
        document.querySelectorAll('.plugin-action-btn').forEach(button => {
            button.addEventListener('click', handlePluginAction);
        });

    } catch (error) {
        console.error('Error rendering plugin cards:', error);
        activeContainer.innerHTML = '<p>Error loading plugin information.</p>';
    }
}

async function handlePluginAction(event) {
    const button = event.currentTarget;
    const pluginId = button.dataset.pluginId;
    const action = button.dataset.action;

    if (!pluginId || !action) return;

    // Prevent double clicks
    button.disabled = true;
    const originalIcon = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        let result;
        if (action === 'delete') {
            result = await window.electronAPI.deletePlugin(pluginId);
        } else {
            result = await window.electronAPI.togglePluginState(pluginId);
        }

        if (result.success) {
            // Let the main process handle notifications/restarts.
            // We just need to refresh the UI if the app doesn't restart.
            if (!result.restarted) {
                await renderPluginCards();
            }
        } else {
            showNotification(`Error: ${result.message}`, 'error');
            button.disabled = false; // Re-enable button on failure
            button.innerHTML = originalIcon;
        }
    } catch (error) {
        showNotification(`An unexpected error occurred: ${error.message}`, 'error');
        button.disabled = false; // Re-enable button on error
        button.innerHTML = originalIcon;
    }
}


console.log('WinTool app.js loaded');

