import {
    currentTab,
    setCurrentTab,
    tabs,
    hiddenTabs,
    tabLoader,
    DEFAULT_TAB_ORDER,
} from './state.js';
import { showNotification } from './notifications.js';

/**
 * Tab System Module
 *
 * This module manages the core tab system functionality including:
 * - Tab initialization and event handling
 * - Tab switching and navigation
 * - Drag and drop tab reordering
 * - Tab search functionality
 * - Dynamic tab loading and management
 *
 * The tab system supports both static tabs (welcome, plugins) and dynamic
 * folder-based tabs loaded through the TabLoader system.
 */

/**
 * Initialize the complete tab system
 *
 * This function sets up the core tab system infrastructure including:
 * 1. Event listeners for tab navigation clicks
 * 2. Tab search functionality for filtering tabs
 * 3. Drag and drop reordering capabilities
 * 4. Registration of core static tabs (welcome, plugins)
 *
 * Called during application startup to establish the tab framework
 * before dynamic tabs are loaded by the TabLoader.
 *
 * @returns {void}
 */
export function initTabSystem() {
    // Set up click event listeners for all tab navigation items
    // Each tab item has a data-tab attribute that identifies the target tab
    const tabItems = document.querySelectorAll('.tab-item');
    tabItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabName = item.getAttribute('data-tab');
            switchToTab(tabName);
        });
    });

    // Initialize tab search functionality
    // Allows users to filter visible tabs by name or content
    initTabSearch();

    // Initialize drag and drop tab reordering
    // Enables users to customize tab order through drag and drop
    initDraggableTabs();

    // Register core static tabs that are always available
    // These tabs are built into the application and don't require dynamic loading
    tabs.set('welcome', {
        name: 'Welcome',
        icon: 'fas fa-home',
        content: document.getElementById('tab-welcome').innerHTML,
    });

    tabs.set('plugins', {
        name: 'Plugins',
        icon: 'fas fa-puzzle-piece',
        content: document.getElementById('tab-plugins').innerHTML,
    });
}

function initTabSearch() {
    const searchInput = document.getElementById('tab-search');
    if (!searchInput) return;

    searchInput.addEventListener('input', e => {
        searchTabs(e.target.value);
    });

    searchInput.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            searchTabs('');
            searchInput.blur();
        }
    });
}

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
 * Initialize drag and drop functionality for tab reordering
 *
 * Sets up the drag and drop system that allows users to reorder tabs
 * by dragging them within the tab list. This enhances user experience
 * by providing customizable tab organization.
 *
 * @async
 * @returns {Promise<void>}
 */
async function initDraggableTabs() {
    try {
        // Enable the draggable tabs functionality
        enableDraggableTabsFunction();
    } catch (error) {
        console.error('Error initializing draggable tabs:', error);
    }
}

/**
 * Enable draggable functionality on the tab list
 *
 * Configures the tab list container to support drag and drop operations
 * and makes all existing tab items draggable. This function:
 * 1. Adds CSS classes for drag styling
 * 2. Enables draggable attributes on tab items
 * 3. Sets up drag event listeners
 *
 * @returns {void}
 */
function enableDraggableTabsFunction() {
    const tabList = document.getElementById('tab-list');
    if (!tabList) return;

    // Add CSS class to enable drag and drop styling
    tabList.classList.add('draggable-enabled');

    // Make all current tab items draggable
    makeAllTabsDraggable();
}

/**
 * Make all existing tab items draggable
 *
 * This function enables drag and drop functionality on all tab items by:
 * 1. Setting the draggable HTML attribute to true
 * 2. Adding CSS classes for drag styling
 * 3. Registering all necessary drag event listeners
 *
 * User Interaction: Allows users to reorder tabs by dragging them
 * Business Logic: Provides customizable tab organization for improved workflow
 *
 * @returns {void}
 */
function makeAllTabsDraggable() {
    const tabItems = document.querySelectorAll('.tab-item');

    tabItems.forEach(tabItem => {
        tabItem.draggable = true; // Enable HTML5 drag and drop
        tabItem.classList.add('draggable'); // Add styling for draggable state
        addDragListeners(tabItem); // Register drag event handlers
    });
}

/**
 * Add drag and drop event listeners to a tab item
 *
 * Registers all necessary drag events for complete drag and drop functionality:
 * - dragstart: Initiates drag operation and sets up drag data
 * - dragend: Cleans up after drag operation completes
 * - dragover: Handles drag over events for drop zone validation
 * - drop: Processes the actual drop operation and reordering
 * - dragenter/dragleave: Provides visual feedback during drag operations
 *
 * User Experience: Provides smooth, intuitive drag and drop with visual feedback
 *
 * @param {HTMLElement} tabItem - The tab item element to make draggable
 * @returns {void}
 */
function addDragListeners(tabItem) {
    tabItem.addEventListener('dragstart', handleDragStart); // Start drag operation
    tabItem.addEventListener('dragend', handleDragEnd); // End drag operation
    tabItem.addEventListener('dragover', handleDragOver); // Handle drag over
    tabItem.addEventListener('drop', handleDrop); // Handle drop
    tabItem.addEventListener('dragenter', handleDragEnter); // Visual feedback on enter
    tabItem.addEventListener('dragleave', handleDragLeave); // Visual feedback on leave
}

let draggedTab = null;
let dragOverTab = null;

/**
 * Handle drag start event
 *
 * Initiates the drag operation when user starts dragging a tab. This function:
 * 1. Stores reference to the dragged tab for later use
 * 2. Applies visual styling to indicate drag state
 * 3. Sets up drag data transfer for the operation
 * 4. Activates drag mode styling on the tab list
 *
 * User Interaction: User clicks and drags a tab to start reordering
 * Visual Feedback: Tab becomes semi-transparent and tab list shows drop zones
 *
 * @param {DragEvent} e - The drag start event
 * @returns {void}
 */
function handleDragStart(e) {
    draggedTab = this; // Store reference to dragged tab
    this.classList.add('dragging'); // Apply dragging visual state

    // Configure drag operation
    e.dataTransfer.effectAllowed = 'move'; // Only allow move operations
    e.dataTransfer.setData('text/html', this.outerHTML); // Set drag data

    // Activate drag mode on the tab list for visual feedback
    const tabList = document.getElementById('tab-list');
    if (tabList) {
        tabList.classList.add('drag-active');
    }
}

/**
 * Handle drag end event
 *
 * Cleans up after drag operation completes (whether successful or cancelled).
 * This function:
 * 1. Removes drag-specific visual styling
 * 2. Deactivates drag mode on the tab list
 * 3. Clears drag-over indicators from all tabs
 * 4. Resets drag operation state variables
 *
 * User Experience: Restores normal visual state after drag operation
 * Cleanup: Ensures no visual artifacts remain after drag operation
 *
 * @param {DragEvent} e - The drag end event
 * @returns {void}
 */
function handleDragEnd(e) {
    this.classList.remove('dragging'); // Remove dragging visual state

    // Deactivate drag mode on the tab list
    const tabList = document.getElementById('tab-list');
    if (tabList) {
        tabList.classList.remove('drag-active');
    }

    // Clean up drag-over indicators from all tab items
    const tabItems = document.querySelectorAll('.tab-item');
    tabItems.forEach(item => {
        item.classList.remove('drag-over', 'drag-over-bottom');
    });

    // Reset drag operation state
    draggedTab = null;
    dragOverTab = null;
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }

    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    if (this === draggedTab) return;

    dragOverTab = this;

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

function handleDragLeave(e) {
    if (!this.contains(e.relatedTarget)) {
        this.classList.remove('drag-over', 'drag-over-bottom');
    }
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    if (draggedTab !== this) {
        const rect = this.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const insertBefore = e.clientY < midpoint;

        const tabList = document.getElementById('tab-list');
        if (insertBefore) {
            tabList.insertBefore(draggedTab, this);
        } else {
            tabList.insertBefore(draggedTab, this.nextSibling);
        }

        saveTabOrder();
    }

    return false;
}

export async function saveTabOrder() {
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

export async function loadTabOrder() {
    try {
        if (!window.electronAPI) return;

        const savedOrder = await window.electronAPI.getSetting('tabOrder', []);

        if (!savedOrder || savedOrder.length === 0) {
            console.log('No saved drag-and-drop tab order found. Using default.');
            return;
        }

        console.log('Applying saved drag-and-drop tab order.');
        const tabList = document.getElementById('tab-list');
        if (!tabList) return;

        const tabItems = document.querySelectorAll('.tab-item');
        const tabMap = new Map();
        tabItems.forEach(item => {
            const tabId = item.getAttribute('data-tab');
            tabMap.set(tabId, item);
        });

        savedOrder.forEach(tabId => {
            const tabItem = tabMap.get(tabId);
            if (tabItem) {
                tabList.appendChild(tabItem);
                tabMap.delete(tabId);
            }
        });

        tabMap.forEach(tabItem => {
            tabList.appendChild(tabItem);
        });

        console.log('Tab order loaded and applied:', savedOrder);
    } catch (error) {
        console.error('Error loading tab order:', error);
    }
}

export function makeNewTabDraggable(tabItem) {
    try {
        tabItem.draggable = true;
        tabItem.classList.add('draggable');
        addDragListeners(tabItem);
    } catch (error) {
        console.error('Error making new tab draggable:', error);
    }
}

/**
 * Switch to a specific tab
 *
 * This is the core tab navigation function that handles switching between tabs.
 * It performs the following operations:
 * 1. Validates the target tab exists
 * 2. Updates the current tab state
 * 3. Triggers lazy loading for the target tab if needed
 * 4. Updates UI to show the new tab content
 * 5. Manages tab visibility and active states
 *
 * The function supports both static tabs and dynamically loaded folder-based tabs.
 * It integrates with the lazy loading system to ensure tab scripts are executed
 * only when needed for optimal performance.
 *
 * @async
 * @param {string} tabName - The identifier of the tab to switch to
 * @returns {Promise<void>}
 */
export async function switchToTab(tabName) {
    const previousTabId = currentTab;
    if (previousTabId === tabName) return;

    console.log(`Attempting to switch to tab: ${tabName}`);

    // Validate that both the tab navigation element and content element exist
    const targetTabElement = document.querySelector(`[data-tab="${tabName}"]`);
    const targetContentElement = document.getElementById(`tab-${tabName}`);

    if (!targetTabElement || !targetContentElement) {
        console.error(
            `Tab "${tabName}" not found. Available tabs:`,
            Array.from(document.querySelectorAll('.tab-item')).map(item =>
                item.getAttribute('data-tab')
            )
        );
        return;
    }

    // Update the global current tab state
    setCurrentTab(tabName);

    // Trigger lazy loading for the tab if the TabLoader system is available
    // This ensures tab-specific JavaScript is executed when the tab is first accessed
    if (window.tabLoader && typeof window.tabLoader.executeTabJSOnDemand === 'function') {
        window.tabLoader.executeTabJSOnDemand(tabName);
    }

    const tabItems = document.querySelectorAll('.tab-item');
    tabItems.forEach(item => {
        if (item.getAttribute('data-tab') === tabName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        if (content.id === `tab-${tabName}`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });

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

export async function refreshCurrentTab() {
    console.log(`Refreshing current tab: ${currentTab}`);

    try {
        const activeTabContent = document.querySelector('.tab-content.active');
        if (!activeTabContent) {
            console.warn('No active tab found to refresh');
            return;
        }

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

        setTimeout(() => {
            if (loadingIndicator.parentNode) {
                loadingIndicator.remove();
            }
        }, 2000);

        if (currentTab === 'system-info' || currentTab === 'folder-system-info') {
            await refreshSystemInformation();
        } else if (currentTab === 'networking' || currentTab === 'folder-networking') {
            const container = activeTabContent;
            if (window.loadNetworkingInfo && typeof window.loadNetworkingInfo === 'function') {
                await window.loadNetworkingInfo(container);
            }
        } else if (currentTab === 'services' || currentTab === 'folder-services') {
            const refreshBtn = activeTabContent.querySelector('[id*="refresh-services"]');
            if (refreshBtn) {
                refreshBtn.click();
            }
        } else if (
            currentTab === 'environment-variables' ||
            currentTab === 'folder-environment-variables'
        ) {
            if (
                window.refreshEnvironmentVariables &&
                typeof window.refreshEnvironmentVariables === 'function'
            ) {
                await window.refreshEnvironmentVariables();
            }
        } else if (currentTab === 'applications' || currentTab === 'folder-applications') {
            const refreshBtn = activeTabContent.querySelector('[id*="refresh-applications"]');
            if (refreshBtn) {
                refreshBtn.click();
            }
        } else if (currentTab === 'cleanup' || currentTab === 'folder-cleanup') {
            const refreshBtn = activeTabContent.querySelector('[id*="refresh-cleanup"]');
            if (refreshBtn) {
                refreshBtn.click();
            }
        } else if (currentTab === 'tweaks' || currentTab === 'folder-tweaks') {
            // Reset tweaks initialization to force reload
            if (
                window.resetTweaksInitialization &&
                typeof window.resetTweaksInitialization === 'function'
            ) {
                window.resetTweaksInitialization();

                // Reset the jsExecuted flag in tab loader to allow re-execution
                if (
                    window.tabLoader &&
                    typeof window.tabLoader.resetTabJSExecution === 'function'
                ) {
                    window.tabLoader.resetTabJSExecution(currentTab);
                }

                // Trigger re-render by re-executing the JavaScript
                setTimeout(() => {
                    if (
                        window.tabLoader &&
                        typeof window.tabLoader.executeTabJSOnDemand === 'function'
                    ) {
                        window.tabLoader.executeTabJSOnDemand(currentTab);
                    }
                }, 100);
            }
        } else {
            // Try to use standardized reset functions for other tabs
            const resetFunctionName = `reset${currentTab.charAt(0).toUpperCase() + currentTab.slice(1)}Initialization`;
            if (window[resetFunctionName] && typeof window[resetFunctionName] === 'function') {
                console.log(`Using standardized reset function: ${resetFunctionName}`);
                window[resetFunctionName]();

                // Reset the jsExecuted flag in tab loader to allow re-execution
                if (
                    window.tabLoader &&
                    typeof window.tabLoader.resetTabJSExecution === 'function'
                ) {
                    window.tabLoader.resetTabJSExecution(currentTab);
                }

                // Trigger re-render by re-executing the JavaScript
                setTimeout(() => {
                    if (
                        window.tabLoader &&
                        typeof window.tabLoader.executeTabJSOnDemand === 'function'
                    ) {
                        window.tabLoader.executeTabJSOnDemand(currentTab);
                    }
                }, 100);
            } else {
                // Fallback to looking for refresh buttons
                const refreshBtn = activeTabContent.querySelector(
                    'button[id*="refresh"], .refresh-btn, [data-action="refresh"]'
                );
                if (refreshBtn) {
                    refreshBtn.click();
                } else {
                    console.log(`No specific refresh handler found for tab: ${currentTab}`);
                }
            }
        }

        console.log(`Tab ${currentTab} refreshed successfully`);
    } catch (error) {
        console.error('Error refreshing current tab:', error);
    }
}

export async function refreshSystemInformation() {
    console.log('Refreshing system information...');

    try {
        const refreshIndicator = document.createElement('div');
        refreshIndicator.className = 'global-refresh-indicator';
        refreshIndicator.innerHTML =
            '<i class="fas fa-sync-alt fa-spin"></i> Refreshing System Information...';
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
        `;

        document.body.appendChild(refreshIndicator);

        setTimeout(() => {
            if (refreshIndicator.parentNode) {
                refreshIndicator.remove();
            }
        }, 3000);

        const systemInfoTab =
            document.getElementById('tab-system-info') ||
            document.getElementById('tab-folder-system-info');
        if (systemInfoTab) {
            if (window.loadSystemInfo && typeof window.loadSystemInfo === 'function') {
                await window.loadSystemInfo(systemInfoTab);
            }
        }

        const networkingTab =
            document.getElementById('tab-networking') ||
            document.getElementById('tab-folder-networking');
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
