/**
 * WinTool - Main JavaScript File
 * Contains common functionality used across the application
 *
 * This file handles:
 * - Tab loading and switching
 * - Splash screen management
 * - UI initialization
 * - Window controls
 * - Sidebar management
 */

// Global variables and state
let currentTab = 'welcome'; // Currently active tab
let hiddenTabs = JSON.parse(localStorage.getItem('hiddenTabs') || '[]');
let pinnedTabs = JSON.parse(localStorage.getItem('pinnedTabs') || '[]');

// Tab state tracking
const loadedTabs = new Set(); // Tracks which tabs have been loaded
const loadingTabs = new Set(); // Tracks tabs that are currently loading
let allTabsLoaded = false; // Flag to track if all tabs have been loaded

// Flag to track if we're running from an ASAR package
const isPackaged = window.location.href.includes('app.asar');

/**
 * Get all possible HTML paths for a tab
 * @param {string} tabName - The name of the tab
 * @returns {string[]} - Array of possible paths to try
 */
function getTabHtmlPaths(tabName) {
    const paths = [];

    if (isPackaged) {
        // When packaged, try these paths first
        paths.push(`../html/tabs/${tabName}.html`);
        paths.push(`../app.asar/html/tabs/${tabName}.html`);
        paths.push(`../app.asar/src/html/tabs/${tabName}.html`);
        paths.push(`../../resources/html/tabs/${tabName}.html`);
        paths.push(`../resources/html/tabs/${tabName}.html`);
    }

    // Common paths to try for both packaged and development
    paths.push(`html/tabs/${tabName}.html`);
    paths.push(`./html/tabs/${tabName}.html`);
    paths.push(`/html/tabs/${tabName}.html`);
    paths.push(`src/html/tabs/${tabName}.html`);
    paths.push(`../../html/tabs/${tabName}.html`);

    return paths;
}

/**
 * Hide the splash screen when app is ready
 * Only hides if all tabs are loaded
 */
function hideSplash() {
    // Don't hide splash if not all tabs are loaded yet
    if (!allTabsLoaded) {
        return;
    }

    const splash = document.getElementById('splash-screen');
    if (!splash) {
        return;
    }

    // Fade out splash screen
    splash.style.opacity = 0;
    setTimeout(() => {
        splash.style.display = 'none';
    }, 400);

    // Clear the status text rotation interval when hiding splash
    if (window.statusTextInterval) {
        clearInterval(window.statusTextInterval);
    }
}

// Make hideSplash available globally
window.hideSplash = hideSplash;

/**
 * Initialize splash screen with a simple status message
 * Sets up the initial progress bar
 */
function initSplashStatusMessages() {
    // Verify splash screen exists
    const splashScreen = document.getElementById('splash-screen');
    if (!splashScreen) {
        return;
    }

    // Ensure splash screen is visible
    splashScreen.style.display = 'flex';
    splashScreen.style.opacity = '1';

    const statusTextElement = document.getElementById('splash-status-text');
    if (!statusTextElement) {
        return;
    }

    // Set initial status message
    statusTextElement.textContent = "Initializing...";

    // Initialize progress bar at 0%
    const progressBar = document.getElementById('splash-progress');
    if (progressBar) {
        progressBar.style.width = '0%';
    }

    // Gradually increase progress bar to show activity
    window.statusTextInterval = setInterval(() => {
        if (progressBar && parseFloat(progressBar.style.width) < 20) {
            const currentWidth = parseFloat(progressBar.style.width) || 0;
            progressBar.style.width = `${Math.min(currentWidth + 1, 20)}%`;
        }
    }, 500);
}

/**
 * Update splash screen with loading progress
 * @param {string} tabName - Name of the tab being loaded
 * @param {number} current - Current progress count
 * @param {number} total - Total items to load
 */
function updateSplashProgress(tabName, current, total) {
    // Verify splash screen is visible
    const splashScreen = document.getElementById('splash-screen');
    if (!splashScreen) {
        return;
    } else if (splashScreen.style.display === 'none' || splashScreen.style.opacity === '0') {
        splashScreen.style.display = 'flex';
        splashScreen.style.opacity = '1';
    }

    const statusTextElement = document.getElementById('splash-status-text');
    const progressBar = document.getElementById('splash-progress');

    if (!statusTextElement || !progressBar) return;

    // Calculate percentage
    const percentage = Math.round((current / total) * 100);

    // Update progress bar width
    progressBar.style.width = `${percentage}%`;

    // Update status text with simple information
    const statusMessage = `Loading... ${current}/${total}`;
    statusTextElement.textContent = statusMessage;
}

/**
 * Preload all tabs before hiding splash screen
 * Loads all tab content in sequence and initializes each tab
 */
async function preloadAllTabs() {
    // Verify splash screen is still visible
    const splashScreen = document.getElementById('splash-screen');
    if (!splashScreen) {
        return;
    } else if (splashScreen.style.display === 'none' || splashScreen.style.opacity === '0') {
        splashScreen.style.display = 'flex';
        splashScreen.style.opacity = '1';
    }

    // Get all tab names from the sidebar
    const tabItems = document.querySelectorAll('.tab-item');
    const allTabNames = Array.from(tabItems).map(item => item.getAttribute('data-tab')).filter(Boolean);

    // Track loading progress
    let loadedCount = 0;
    const totalTabs = allTabNames.length;

    // Clear the status text rotation interval
    if (window.statusTextInterval) {
        clearInterval(window.statusTextInterval);
    }

    // Update splash screen to show we're loading tabs
    const statusTextElement = document.getElementById('splash-status-text');
    if (statusTextElement) {
        statusTextElement.textContent = `Loading tabs... (0/${totalTabs})`;
    }

    // Verify progress bar exists
    const progressBar = document.getElementById('splash-progress');
    if (progressBar) {
        progressBar.style.width = '0%';
    }

    // Load all tabs
    for (const tabName of allTabNames) {
        // Skip if already loaded
        if (loadedTabs.has(tabName)) {
            loadedCount++;
            updateSplashProgress(tabName, loadedCount, totalTabs);
            continue;
        }

        try {
            updateSplashProgress(tabName, loadedCount, totalTabs);

            // Mark tab as loading
            loadingTabs.add(tabName);

            // Get the tab content element
            const tabContentElement = document.getElementById('tab-' + tabName);
            if (!tabContentElement) {
                loadingTabs.delete(tabName);
                continue;
            }

            // Get all possible paths to try for this tab
            const pathsToTry = getTabHtmlPaths(tabName);

            let loaded = false;
            let lastError = null;

            // Try each path until one works
            for (const path of pathsToTry) {
                try {
                    const response = await fetch(path);

                    if (response.ok) {
                        const htmlContent = await response.text();
                        tabContentElement.innerHTML = htmlContent;
                        loaded = true;
                        break;
                    } else {
                        lastError = new Error(`HTTP error: ${response.status}`);
                    }
                } catch (error) {
                    lastError = error;
                }
            }

            // If none of the paths worked, throw the last error
            if (!loaded) {
                throw new Error(`Failed to load tab content after trying all paths: ${lastError?.message || 'Unknown error'}`);
            }

            // Mark as loaded
            tabContentElement.dataset.loaded = 'true';
            loadedTabs.add(tabName);

            // Initialize tab if it has an init function
            const initFunctionName = `init${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`;
            if (typeof window[initFunctionName] === 'function') {
                await Promise.resolve(window[initFunctionName]());

                // Dispatch tab loaded event
                document.dispatchEvent(new CustomEvent('tabLoaded', {
                    detail: { tab: tabName }
                }));
            }

            // Update progress
            loadedCount++;
            updateSplashProgress(tabName, loadedCount, totalTabs);

            // Add a small delay between loading tabs to prevent UI freezing
            await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
            console.error(`Error loading tab ${tabName}:`, error);
        } finally {
            // Mark tab as no longer loading
            loadingTabs.delete(tabName);
        }
    }

    // Now that all tabs are loaded, mark as complete and hide splash screen
    allTabsLoaded = true;
    hideSplash();
}

/**
 * Load remaining tabs in the background
 * @param {string[]} tabNames - Array of tab names to load
 * @param {number} startCount - Starting count for progress tracking
 * @param {number} totalTabs - Total number of tabs
 */
async function loadRemainingTabsInBackground(tabNames, startCount, totalTabs) {
    let loadedCount = startCount;

    // Load each tab in sequence with a small delay between each
    for (const tabName of tabNames) {
        // Skip if already loaded
        if (loadedTabs.has(tabName)) {
            loadedCount++;
            continue;
        }

        // Skip if already loading
        if (loadingTabs.has(tabName)) {
            continue;
        }

        try {
            // Mark tab as loading
            loadingTabs.add(tabName);

            // Get the tab content element
            const tabContentElement = document.getElementById('tab-' + tabName);
            if (!tabContentElement) {
                loadingTabs.delete(tabName);
                continue;
            }

            // Get all possible paths to try for this tab
            const pathsToTry = getTabHtmlPaths(tabName);

            let loaded = false;
            let lastError = null;

            // Try each path until one works
            for (const path of pathsToTry) {
                try {
                    const response = await fetch(path);

                    if (response.ok) {
                        const htmlContent = await response.text();
                        tabContentElement.innerHTML = htmlContent;
                        loaded = true;
                        break;
                    } else {
                        lastError = new Error(`HTTP error: ${response.status}`);
                    }
                } catch (error) {
                    lastError = error;
                }
            }

            // If none of the paths worked, throw the last error
            if (!loaded) {
                throw new Error(`Failed to load tab content after trying all paths: ${lastError?.message || 'Unknown error'}`);
            }

            // Mark as loaded
            tabContentElement.dataset.loaded = 'true';
            loadedTabs.add(tabName);

            // Initialize tab if it has an init function
            const initFunctionName = `init${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`;
            if (typeof window[initFunctionName] === 'function') {
                await Promise.resolve(window[initFunctionName]());

                // Dispatch tab loaded event
                document.dispatchEvent(new CustomEvent('tabLoaded', {
                    detail: { tab: tabName }
                }));
            }

            // Update progress
            loadedCount++;

            // Add a small delay between loading tabs to prevent UI freezing
            await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error) {
            console.error(`Error loading background tab ${tabName}:`, error);
        } finally {
            // Mark tab as no longer loading
            loadingTabs.delete(tabName);
        }
    }
}

/**
 * Apply accent color to splash screen and UI elements
 * Derives darker and faded versions of the accent color
 */
function applySplashAccent() {
    let color = localStorage.getItem('accentColor') || '#ff9800';
    document.documentElement.style.setProperty('--primary', color);

    try {
        /**
         * Create a darker version of a hex color
         * @param {string} hex - Hex color code
         * @param {number} amt - Amount to darken (0-255)
         * @returns {string} - Darkened hex color
         */
        function darken(hex, amt) {
            let n = parseInt(hex.replace('#', ''), 16);
            let r = Math.max(((n >> 16) & 0xff) - amt, 0);
            let g = Math.max(((n >> 8) & 0xff) - amt, 0);
            let b = Math.max((n & 0xff) - amt, 0);
            return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
        }

        // Create dark and faded versions of the color
        let dark = darken(color, 30);
        let faded = color.replace('#', '');
        let rf = parseInt(faded.substring(0,2),16);
        let gf = parseInt(faded.substring(2,4),16);
        let bf = parseInt(faded.substring(4,6),16);

        // Set CSS variables
        document.documentElement.style.setProperty('--primary-dark', dark);
        document.documentElement.style.setProperty('--primary-faded', `rgba(${rf},${gf},${bf},0.22)`);
        document.documentElement.style.setProperty('--primary-rgb', `${rf},${gf},${bf}`);

        // Update logo gradient
        const logoFull = document.querySelector('.logo-full');
        const logoCollapsed = document.querySelector('.logo-collapsed');

        if (logoFull) {
            logoFull.style.background = `linear-gradient(135deg, ${color} 0%, ${dark} 100%)`;
            logoFull.style.webkitBackgroundClip = 'text';
            logoFull.style.backgroundClip = 'text';
            logoFull.style.color = 'transparent';
        }

        if (logoCollapsed) {
            logoCollapsed.style.background = `linear-gradient(135deg, ${color} 0%, ${dark} 100%)`;
            logoCollapsed.style.webkitBackgroundClip = 'text';
            logoCollapsed.style.backgroundClip = 'text';
            logoCollapsed.style.color = 'transparent';
        }
    } catch(e) {
        console.error('Error applying accent color:', e);
    }
}

/**
 * Set sidebar collapsed/expanded state
 * @param {boolean} state - Whether sidebar should be collapsed
 * @param {boolean} updateCheckbox - Whether to update the toggle checkbox
 */
function setSidebarCollapsed(state, updateCheckbox = true) {
    const tabList = document.getElementById('winToolTabs');
    const sidebarFoldToggle = document.getElementById('sidebar-fold-toggle');
    const logoFull = document.querySelector('.logo-full');
    const logoCollapsed = document.querySelector('.logo-collapsed');
    const sidebar = document.querySelector('.sidebar');

    const collapsed = state;

    // Toggle the collapsed class on the tab list
    if (tabList) {
        tabList.classList.toggle('collapsed', collapsed);
    }

    // Update the checkbox if needed
    if (updateCheckbox && sidebarFoldToggle) {
        sidebarFoldToggle.checked = collapsed;
    }

    // Toggle logo visibility
    if (logoFull && logoCollapsed) {
        logoFull.style.display = collapsed ? 'none' : 'block';
        logoCollapsed.style.display = collapsed ? 'block' : 'none';
    }

    // Update sidebar width
    if (sidebar) {
        sidebar.style.minWidth = collapsed ? '60px' : '160px';
        sidebar.style.width = collapsed ? '60px' : '200px';
        sidebar.style.maxWidth = collapsed ? '60px' : '220px';
    }

    // Persist state
    localStorage.setItem('sidebarCollapsed', collapsed ? '1' : '0');
}

/**
 * Switch between tabs in the UI
 * @param {string} tabName - Name of the tab to switch to
 */
function switchTab(tabName) {
    // Update current tab
    currentTab = tabName;

    // Get accent color
    const accentColor = localStorage.getItem('accentColor') || '#ff9800';

    // Update tab items in sidebar
    const tabItems = document.querySelectorAll('.tab-item');
    tabItems.forEach(item => {
        const isActive = item.getAttribute('data-tab') === tabName;

        // Update active state
        item.classList.toggle('active', isActive);

        // Apply accent color to active tab
        if (isActive) {
            item.style.backgroundColor = accentColor;
            item.style.color = '#fff';

            // Ensure the active tab is visible by scrolling to it if needed
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            item.style.backgroundColor = '';
            item.style.color = '';
        }
    });

    // Update tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        const isActive = content.id === 'tab-' + tabName;
        content.style.display = isActive ? 'flex' : 'none';
        content.classList.toggle('active', isActive);
    });

    // Dispatch tab switched event for any listeners
    document.dispatchEvent(new CustomEvent('tabSwitched', {
        detail: { tab: tabName }
    }));
}

// Global variable to track low-resource mode
let isLowResourceMode = false;

/**
 * Check if we're in low-resource mode and apply optimizations
 * @returns {Promise<boolean>} - Whether low-resource mode is active
 */
async function checkLowResourceMode() {
    try {
        isLowResourceMode = await window.electronAPI.isLowResourceMode();

        // Apply low-resource optimizations to the UI
        if (isLowResourceMode) {
            document.body.classList.add('low-resource-mode');

            // Disable animations and effects for better performance
            const style = document.createElement('style');
            style.textContent = `
                * {
                    animation-duration: 0.001s !important;
                    transition-duration: 0.001s !important;
                }
                .splash-content {
                    animation: none !important;
                }
            `;
            document.head.appendChild(style);
        }

        return isLowResourceMode;
    } catch (error) {
        console.error('Error checking low-resource mode:', error);
        return false;
    }
}

/**
 * Load tab content dynamically
 * @param {string} tabName - Name of the tab to load
 */
async function loadTabContent(tabName) {
    // Switch to tab FIRST for immediate feedback
    switchTab(tabName);

    // If already loaded, no need to load again
    if (loadedTabs.has(tabName)) {
        return;
    }

    // If already loading, just wait for it to complete
    if (loadingTabs.has(tabName)) {
        return;
    }

    // Mark tab as loading
    loadingTabs.add(tabName);

    // Get the tab content element
    const tabContentElement = document.getElementById('tab-' + tabName);
    if (!tabContentElement) {
        loadingTabs.delete(tabName);
        return;
    }

    // Create loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'tab-loading-indicator';
    loadingIndicator.innerHTML = '<div class="loading-spinner"></div><div class="loading-text">Loading...</div>';

    try {
        // Clean up previous tab if needed
        if (currentTab === 'drivers' && tabName !== 'drivers') {
            if (typeof window.cleanupDriversTab === 'function') {
                window.cleanupDriversTab();
            }
        }

        // Special handling for terminal tab (for backward compatibility)
        if (tabName === 'terminal') {
            // Force immediate display for terminal tab
            tabContentElement.style.display = 'flex';
            tabContentElement.classList.add('active');
        }

        // Add loading indicator (only if not already added for special tabs)
        if (!(tabName === 'terminal' || tabName === 'drivers' || tabName === 'hardware')) {
            tabContentElement.appendChild(loadingIndicator);
        }

        // Get all possible paths to try for this tab
        const pathsToTry = getTabHtmlPaths(tabName);

        // Load HTML content
        let loaded = false;
        let lastError = null;

        // Try each path until one works
        for (const path of pathsToTry) {
            try {
                const response = await fetch(path);

                if (response.ok) {
                    const htmlContent = await response.text();
                    tabContentElement.innerHTML = htmlContent;
                    loaded = true;
                    break;
                } else {
                    lastError = new Error(`HTTP error: ${response.status}`);
                }
            } catch (error) {
                lastError = error;
            }
        }

        // If none of the paths worked, throw the last error
        if (!loaded) {
            throw new Error(`Failed to load tab content after trying all paths: ${lastError?.message || 'Unknown error'}`);
        }

        // Mark as loaded
        tabContentElement.dataset.loaded = 'true';
        loadedTabs.add(tabName);

        // Refresh FontAwesome icons
        if (window.FontAwesome?.dom?.i2svg) {
            window.FontAwesome.dom.i2svg({ node: tabContentElement });
        }

        // Initialize tab if it has an init function
        const initFunctionName = `init${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`;
        if (typeof window[initFunctionName] === 'function') {
            await Promise.resolve(window[initFunctionName]());

            // Dispatch tab loaded event
            document.dispatchEvent(new CustomEvent('tabLoaded', {
                detail: { tab: tabName }
            }));
        } else {
            // Dispatch tab loaded event even if no init function
            document.dispatchEvent(new CustomEvent('tabLoaded', {
                detail: { tab: tabName }
            }));
        }

    } catch (error) {
        console.error(`Error loading ${tabName} tab:`, error);
        showErrorNotification(`Failed to load ${tabName} tab: ${error.message}`);

        // Show error in tab content
        tabContentElement.innerHTML = `<div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Error Loading Tab</h3>
            <p>${error.message}</p>
            <button class="retry-btn" onclick="retryLoadTab('${tabName}')">Retry</button>
        </div>`;
    } finally {
        // Always remove from loading tabs when done
        loadingTabs.delete(tabName);
    }
}

/**
 * Retry loading a tab that previously failed
 * @param {string} tabName - Name of the tab to retry loading
 */
function retryLoadTab(tabName) {
    // Reset loaded state
    loadedTabs.delete(tabName);

    // Reset the loaded state in the DOM
    const tabContentElement = document.getElementById('tab-' + tabName);
    if (tabContentElement) {
        tabContentElement.dataset.loaded = 'false';
        tabContentElement.innerHTML = '';
    }

    // Try loading again
    loadTabContent(tabName);
}

/**
 * Show a notification toast
 * @param {string} message - Message to display
 * @param {Object} options - Notification options
 * @param {string} [options.type] - Type of notification (success, error, warning, info)
 * @param {number} [options.delay] - Time in ms before auto-hiding
 */
function showNotification(message, options = {}) {
    const toast = document.getElementById('notification-toast');
    if (!toast) return;

    const toastMessage = toast.querySelector('.toast-message');
    const toastIcon = toast.querySelector('.toast-icon');

    if (!toastMessage) return;

    // Set message
    toastMessage.textContent = message;

    // Apply type-specific styling
    toast.className = 'notification-toast';
    if (options.type) {
        toast.classList.add(`notification-${options.type}`);

        // Change icon based on notification type
        if (toastIcon) {
            toastIcon.className = 'toast-icon fas';

            switch(options.type) {
                case 'success':
                    toastIcon.classList.add('fa-check-circle');
                    break;
                case 'error':
                    toastIcon.classList.add('fa-exclamation-circle');
                    break;
                case 'warning':
                    toastIcon.classList.add('fa-exclamation-triangle');
                    break;
                default:
                    toastIcon.classList.add('fa-info-circle');
            }
        }
    } else if (toastIcon) {
        // Default icon
        toastIcon.className = 'toast-icon fas fa-info-circle';
    }

    // Show the toast
    toast.style.display = 'flex';
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Auto-hide after delay
    const delay = options.delay || 4000;
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { toast.style.display = 'none'; }, 350);
    }, delay);
}

/**
 * Show an error notification
 * @param {string} message - Error message to display
 */
function showErrorNotification(message) {
    showNotification(message, { type: 'error', delay: 5000 });
}

// Make functions available globally
window.showNotification = showNotification;
window.showErrorNotification = showErrorNotification;
window.toggleTabVisibility = toggleTabVisibility;
window.toggleTabPin = toggleTabPin;
window.loadTabContent = loadTabContent;
window.switchTab = switchTab;
window.retryLoadTab = retryLoadTab;

/**
 * Show or hide the FPS overlay
 * @param {boolean} show - Whether to show the overlay
 */
function showFpsOverlay(show) {
    const overlay = document.getElementById('fps-overlay');
    if (!overlay) return;

    if (show) {
        overlay.style.display = '';
        let lastFrame = performance.now();
        let frames = 0;

        function updateFps() {
            frames++;
            const now = performance.now();

            // Update FPS counter once per second
            if (now - lastFrame >= 1000) {
                const fps = frames;
                const fpsValue = document.getElementById('fps-value');
                if (fpsValue) {
                    fpsValue.textContent = fps;
                }
                frames = 0;
                lastFrame = now;
            }

            // Continue animation loop if overlay is still visible
            if (overlay.style.display !== 'none') {
                requestAnimationFrame(updateFps);
            }
        }

        requestAnimationFrame(updateFps);
    } else {
        overlay.style.display = 'none';
        const fpsValue = document.getElementById('fps-value');
        if (fpsValue) {
            fpsValue.textContent = '0';
        }
    }
}

// Tab Search functionality
const tabSearchInput = document.getElementById('tab-search');
const tabList = document.getElementById('winToolTabs');
if (tabSearchInput && tabList) {
    tabSearchInput.addEventListener('input', function() {
        const query = this.value.trim().toLowerCase();
        tabList.querySelectorAll('.tab-item').forEach(tab => {
            const label = tab.textContent.toLowerCase();
            if (label.includes(query)) {
                tab.style.display = '';
            } else {
                tab.style.display = 'none';
            }
        });
    });
}

/**
 * Set up tab system and other tab-related functionality
 */
function setupTabs() {
    const tabList = document.getElementById('winToolTabs');

    // Clear any existing event listeners by replacing all tab elements
    const tabItems = document.querySelectorAll('.tab-item');
    const newTabs = [];

    // First, clone all tabs to remove existing event listeners
    tabItems.forEach(tab => {
        const newTab = tab.cloneNode(true);
        newTabs.push(newTab);
        if (tab.parentNode) {
            tab.parentNode.replaceChild(newTab, tab);
        }
    });

    // Now add event listeners to the new tabs
    newTabs.forEach(newTab => {

        // Add mousedown event listener instead of click
        newTab.addEventListener('mousedown', (e) => {
            // Only handle left mouse button
            if (e.button === 0) {
                e.preventDefault();
                e.stopPropagation();
                const tabName = newTab.getAttribute('data-tab');
                if (tabName) {
                    console.log(`Tab clicked: ${tabName}`);

                    // Provide immediate visual feedback
                    const accentColor = localStorage.getItem('accentColor') || '#ff9800';
                    newTab.style.backgroundColor = accentColor;
                    newTab.style.color = '#fff';

                    // Load tab content
                    loadTabContent(tabName);
                }
            }
        });

        // Add context menu for tabs
        newTab.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showTabContextMenu(e, newTab);
        });
    });

    // Set up sidebar collapse/expand
    const sidebarFoldToggle = document.getElementById('sidebar-fold-toggle');
    if (sidebarFoldToggle) {
        sidebarFoldToggle.addEventListener('change', function(e) {
            setSidebarCollapsed(e.target.checked, false);
        });
    }

    // Restore saved tab order
    const savedOrder = JSON.parse(localStorage.getItem('tabOrder') || 'null');
    if (savedOrder && Array.isArray(savedOrder) && tabList) {
        const tabs = Array.from(tabList.children);
        savedOrder.forEach(tabData => {
            const tab = tabs.find(t => t.dataset.tab === tabData);
            if (tab) tabList.appendChild(tab);
        });
    }

    // Apply hidden tabs
    applyHiddenTabs();

    // Apply pinned tabs
    applyPinnedTabs();

    // Make tabs draggable/reorderable
    let draggedTab = null;

    function saveTabOrder() {
        if (!tabList) return;
        const order = Array.from(tabList.children).map(tab => tab.dataset.tab);
        localStorage.setItem('tabOrder', JSON.stringify(order));
    }

    // Set up drag and drop for tab reordering
    if (tabList) {
        // Use the newTabs array we created earlier
        newTabs.forEach(tab => {
            tab.draggable = true;

            tab.addEventListener('dragstart', (e) => {
                draggedTab = tab;
                e.dataTransfer.effectAllowed = 'move';
                setTimeout(() => tab.classList.add('dragging'), 0);
            });

            tab.addEventListener('dragend', () => {
                draggedTab = null;
                tab.classList.remove('dragging');
            });

            tab.addEventListener('dragover', (e) => {
                e.preventDefault();
                tab.classList.add('drag-over');
            });

            tab.addEventListener('dragleave', () => {
                tab.classList.remove('drag-over');
            });

            tab.addEventListener('drop', (e) => {
                e.preventDefault();
                if (draggedTab && draggedTab !== tab) {
                    tabList.insertBefore(draggedTab, tab.nextSibling);
                    saveTabOrder();
                }
                tab.classList.remove('drag-over');
            });
        });
    }

    // Set up notification close button
    const toast = document.getElementById('notification-toast');
    if (toast) {
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                toast.classList.remove('show');
                setTimeout(() => { toast.style.display = 'none'; }, 350);
            });
        }
    }
}

// Tab context menu
function showTabContextMenu(event, tab) {
    // Remove any existing context menu
    const existingMenu = document.getElementById('tab-context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }

    const tabName = tab.getAttribute('data-tab');
    const isHidden = hiddenTabs.includes(tabName);
    const isPinned = pinnedTabs.includes(tabName);

    // Create context menu
    const contextMenu = document.createElement('div');
    contextMenu.id = 'tab-context-menu';
    contextMenu.className = 'context-menu';

    // Add menu items
    const hideItem = document.createElement('div');
    hideItem.className = 'context-menu-item';
    hideItem.innerHTML = isHidden ? '<i class="fas fa-eye"></i> Show Tab' : '<i class="fas fa-eye-slash"></i> Hide Tab';
    hideItem.addEventListener('click', () => {
        toggleTabVisibility(tabName);
        contextMenu.remove();
    });

    const pinItem = document.createElement('div');
    pinItem.className = 'context-menu-item';
    pinItem.innerHTML = isPinned ? '<i class="fas fa-thumbtack"></i> Unpin Tab' : '<i class="fas fa-thumbtack"></i> Pin Tab';
    pinItem.addEventListener('click', () => {
        toggleTabPin(tabName);
        contextMenu.remove();
    });

    contextMenu.appendChild(hideItem);
    contextMenu.appendChild(pinItem);

    // Position the menu
    contextMenu.style.left = `${event.clientX}px`;
    contextMenu.style.top = `${event.clientY}px`;

    // Add to document
    document.body.appendChild(contextMenu);

    // Close menu when clicking elsewhere
    document.addEventListener('click', function closeMenu(e) {
        if (!contextMenu.contains(e.target)) {
            contextMenu.remove();
            document.removeEventListener('click', closeMenu);
        }
    });
}

// Toggle tab visibility
function toggleTabVisibility(tabName) {
    const index = hiddenTabs.indexOf(tabName);

    if (index === -1) {
        // Hide the tab
        hiddenTabs.push(tabName);
        showNotification(`Tab "${getTabDisplayName(tabName)}" has been hidden. You can restore it from Settings.`);
    } else {
        // Show the tab
        hiddenTabs.splice(index, 1);
        showNotification(`Tab "${getTabDisplayName(tabName)}" is now visible.`);
    }

    // Save to localStorage
    localStorage.setItem('hiddenTabs', JSON.stringify(hiddenTabs));

    // Apply changes
    applyHiddenTabs();
}

// Toggle tab pin status
function toggleTabPin(tabName) {
    const index = pinnedTabs.indexOf(tabName);

    if (index === -1) {
        // Pin the tab
        pinnedTabs.push(tabName);
        showNotification(`Tab "${getTabDisplayName(tabName)}" has been pinned.`);
    } else {
        // Unpin the tab
        pinnedTabs.splice(index, 1);
        showNotification(`Tab "${getTabDisplayName(tabName)}" has been unpinned.`);
    }

    // Save to localStorage
    localStorage.setItem('pinnedTabs', JSON.stringify(pinnedTabs));

    // Apply changes
    applyPinnedTabs();
}

// Apply hidden tabs
function applyHiddenTabs() {
    const tabItems = document.querySelectorAll('.tab-item');

    tabItems.forEach(tab => {
        const tabName = tab.getAttribute('data-tab');
        if (hiddenTabs.includes(tabName)) {
            tab.classList.add('hidden-tab');
        } else {
            tab.classList.remove('hidden-tab');
        }
    });
}

// Apply pinned tabs
function applyPinnedTabs() {
    const tabList = document.getElementById('winToolTabs');
    const tabItems = Array.from(document.querySelectorAll('.tab-item'));

    // Remove existing pin indicators
    tabItems.forEach(tab => {
        tab.classList.remove('pinned-tab');
        const existingPin = tab.querySelector('.pin-indicator');
        if (existingPin) {
            existingPin.remove();
        }
    });

    // Add pin indicators to pinned tabs
    tabItems.forEach(tab => {
        const tabName = tab.getAttribute('data-tab');
        if (pinnedTabs.includes(tabName)) {
            tab.classList.add('pinned-tab');

            // Add pin indicator
            const pinIndicator = document.createElement('span');
            pinIndicator.className = 'pin-indicator';
            pinIndicator.innerHTML = '<i class="fas fa-thumbtack"></i>';
            tab.appendChild(pinIndicator);

            // Move pinned tabs to the top
            if (tabList.firstChild !== tab) {
                tabList.insertBefore(tab, tabList.firstChild);
            }
        }
    });

    // Re-sort pinned tabs based on their original order in pinnedTabs array
    const pinnedElements = Array.from(document.querySelectorAll('.tab-item.pinned-tab'));
    pinnedElements.sort((a, b) => {
        const aIndex = pinnedTabs.indexOf(a.getAttribute('data-tab'));
        const bIndex = pinnedTabs.indexOf(b.getAttribute('data-tab'));
        return aIndex - bIndex;
    });

    // Reinsert sorted pinned tabs
    pinnedElements.forEach(tab => {
        tabList.insertBefore(tab, tabList.firstChild);
    });
}

// Get tab display name
function getTabDisplayName(tabName) {
    const tabItem = document.querySelector(`.tab-item[data-tab="${tabName}"]`);
    if (tabItem) {
        return tabItem.querySelector('span').textContent;
    }
    return tabName.charAt(0).toUpperCase() + tabName.slice(1);
}

// Privacy settings verification removed



/**
 * Initialize the application when the DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async function() {
    // First, ensure splash screen is visible and properly styled
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
        // Force splash screen to be visible
        splashScreen.style.display = 'flex';
        splashScreen.style.opacity = '1';
        splashScreen.style.visibility = 'visible';
    }

    // Check if we're in low-resource mode first
    await checkLowResourceMode();

    // Apply accent color
    applySplashAccent();

    // Set up window controls
    setupWindowControls();

    // Set up tab switching
    setupTabs();

    // Restore sidebar state from localStorage
    const savedCollapsed = localStorage.getItem('sidebarCollapsed');
    if (savedCollapsed === '1') {
        setSidebarCollapsed(true);
    }

    // Rotate splash screen status messages (only in normal mode)
    if (!isLowResourceMode) {
        initSplashStatusMessages();
    } else {
        // In low-resource mode, use a simpler loading message
        const statusTextElement = document.getElementById('splash-status-text');
        if (statusTextElement) {
            statusTextElement.textContent = 'Loading application...';
        }
    }

    // Add CSS for low-resource mode
    const lowResourceStyle = document.createElement('style');
    lowResourceStyle.textContent = `
        /* Low-resource mode styles */
        .low-resource-mode .sidebar,
        .low-resource-mode .tab-content,
        .low-resource-mode .tab-item {
            transition: none !important;
        }

        .low-resource-mode .tab-content {
            animation: none !important;
        }
    `;
    document.head.appendChild(lowResourceStyle);

    // Start preloading all tabs
    setTimeout(() => {
        preloadAllTabs();
    }, 100);

    // Set a fallback timeout to hide splash screen in case of errors
    setTimeout(() => {
        if (!allTabsLoaded) {
            allTabsLoaded = true;
            hideSplash();
        }
    }, isLowResourceMode ? 15000 : 30000); // 15 or 30 seconds fallback
});

/**
 * Set up window controls for the custom title bar
 * Handles minimize, maximize, and close buttons
 */
function setupWindowControls() {
    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeBtn = document.getElementById('maximize-btn');
    const closeBtn = document.getElementById('close-btn');

    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            window.electronAPI.minimizeWindow();
        });
    }

    if (maximizeBtn) {
        maximizeBtn.addEventListener('click', () => {
            window.electronAPI.maximizeWindow();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            // Clean up any active tabs before closing
            if (currentTab === 'drivers' && typeof window.cleanupDriversTab === 'function') {
                window.cleanupDriversTab();
            }

            // Call the close window API
            window.electronAPI.closeWindow();
        });
    }
}

/**
 * Legacy event handlers for backward compatibility
 * These are kept in case any other code is listening for these events
 */
document.addEventListener('tabSwitched', function(e) {
    const tabName = e.detail.tab;

    // Special handling for Terminal tab
    if (tabName === 'terminal') {
        // The new TabSystem will handle this properly
    }
});

document.addEventListener('tabLoaded', function(e) {
    // This event listener is kept for backward compatibility
});

// Listen for navigate-to-tab events from the main process
if (window.electronAPI) {
    window.electronAPI.onNavigateToTab((tabName) => {
        if (tabName && typeof switchToTab === 'function') {
            switchToTab(tabName);
        }
    });
}
