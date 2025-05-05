/**
 * WinTool - Main JavaScript File
 * Contains common functionality used across the application
 */

// Global variables and state
let currentTab = 'welcome';
let hiddenTabs = JSON.parse(localStorage.getItem('hiddenTabs') || '[]');
let pinnedTabs = JSON.parse(localStorage.getItem('pinnedTabs') || '[]');

// Splash screen functionality
function hideSplash() {
    const splash = document.getElementById('splash-screen');
    splash.style.opacity = 0;
    setTimeout(() => splash.style.display = 'none', 400);
    
    // Clear the status text rotation interval when hiding splash
    if (window.statusTextInterval) {
        clearInterval(window.statusTextInterval);
    }
}

// Make hideSplash available globally
window.hideSplash = hideSplash;

// Rotate splash screen status messages
function initSplashStatusMessages() {
    const statusMessages = [
        "Finding your hardware. It's somewhere around here?",
        "The server is contemplating its life choices. We'll nudge it along.",
        "Searching the digital couch cushions for what you need.",
        "Waiting for a gap in the digital traffic.",
        "Pretty sure there's a traffic jam on the information superhighway."
    ];
    
    const statusTextElement = document.getElementById('splash-status-text');
    if (!statusTextElement) return;
    
    let currentIndex = 0;
    
    // Update the status text immediately with the first message
    statusTextElement.textContent = statusMessages[currentIndex];
    
    // Set up the interval to change messages every 3 seconds
    window.statusTextInterval = setInterval(() => {
        currentIndex = (currentIndex + 1) % statusMessages.length;
        
        // Fade out the current text
        statusTextElement.style.opacity = 0;
        
        // Change the text and fade it back in after a short delay
        setTimeout(() => {
            statusTextElement.textContent = statusMessages[currentIndex];
            statusTextElement.style.opacity = 1;
        }, 200);
    }, 5000);
}

// Apply accent color to splash and UI elements
function applySplashAccent() {
    let color = localStorage.getItem('accentColor') || '#ff9800';
    document.documentElement.style.setProperty('--primary', color);
    // Derive --primary-dark and --primary-faded for splash if needed
    try {
        // Simple shade: darken by 15%
        function darken(hex, amt) {
            let n = parseInt(hex.replace('#', ''), 16);
            let r = Math.max(((n >> 16) & 0xff) - amt, 0);
            let g = Math.max(((n >> 8) & 0xff) - amt, 0);
            let b = Math.max((n & 0xff) - amt, 0);
            return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
        }
        let dark = darken(color, 30);
        let faded = color.replace('#', '');
        let rf = parseInt(faded.substring(0,2),16), gf = parseInt(faded.substring(2,4),16), bf = parseInt(faded.substring(4,6),16);
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

// Sidebar collapse/expand functionality
function setSidebarCollapsed(state, updateCheckbox = true) {
    const tabList = document.getElementById('winToolTabs');
    const sidebarFoldToggle = document.getElementById('sidebar-fold-toggle');
    const logoFull = document.querySelector('.logo-full');
    const logoCollapsed = document.querySelector('.logo-collapsed');
    const sidebar = document.querySelector('.sidebar');
    
    const collapsed = state;
    
    // Toggle the collapsed class on the tab list
    tabList.classList.toggle('collapsed', collapsed);
    
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

// Tab switching functionality
function switchTab(tabName) {
    // Update tab items
    const tabItems = document.querySelectorAll('.tab-item');
    tabItems.forEach(item => {
        const isActive = item.getAttribute('data-tab') === tabName;
        item.classList.toggle('active', isActive);
        
        // Apply accent color to active tab
        if (isActive) {
            const accentColor = localStorage.getItem('accentColor') || '#ff9800';
            item.style.backgroundColor = accentColor;
            item.style.color = '#fff';
        } else {
            item.style.backgroundColor = '';
            item.style.color = '';
        }
        
        // Ensure icon always uses accent color
        const icon = item.querySelector('i');
        if (icon) {
            const accentColor = localStorage.getItem('accentColor') || '#ff9800';
            icon.style.color = accentColor;
        }
    });

    // Update tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
        if (content.id === 'tab-' + tabName) {
            content.classList.add('active');
            content.style.display = 'block';
        }
    });

    // Update current tab
    currentTab = tabName;
}

// Load tab content dynamically
async function loadTabContent(tabName) {
    const tabContentElement = document.getElementById('tab-' + tabName);
    
    try {
        // First load HTML content
        if (tabContentElement.dataset.loaded !== 'true') {
            // Use a path that works in both development and production
            const htmlPath = window.location.href.includes('app.asar') 
                ? `../html/tabs/${tabName}.html` 
                : `html/tabs/${tabName}.html`;
                
            const response = await fetch(htmlPath);
            if (!response.ok) {
                console.error(`Failed to load tab content: ${response.status}`);
                // Try alternative path as fallback
                const altPath = `./html/tabs/${tabName}.html`;
                console.log(`Trying alternative path: ${altPath}`);
                const altResponse = await fetch(altPath);
                if (!altResponse.ok) throw new Error(`Failed to load tab content: ${response.status}`);
                const htmlContent = await altResponse.text();
                tabContentElement.innerHTML = htmlContent;
            } else {
                const htmlContent = await response.text();
                tabContentElement.innerHTML = htmlContent;
            }
            tabContentElement.dataset.loaded = 'true';
        }

        // Switch to tab first so content is visible
        switchTab(tabName);

        // Initialize tab if it has an init function
        const initFunctionName = `init${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`;
        if (typeof window[initFunctionName] === 'function') {
            try {
                await window[initFunctionName]();
            } catch (error) {
                console.error(`Error initializing ${tabName} tab:`, error);
                showErrorNotification(`Failed to initialize ${tabName} tab: ${error.message}`);
            }
        }

        // Refresh FontAwesome icons
        if (window.FontAwesome?.dom?.i2svg) {
            window.FontAwesome.dom.i2svg({ node: tabContentElement });
        }

        if (tabName === 'driver') {
            const driverTab = document.getElementById('tab-driver');
            if (!driverTab.dataset.loaded) {
                // Use a path that works in both development and production
                const driverHtmlPath = window.location.href.includes('app.asar') 
                    ? `../html/tabs/driver.html` 
                    : `html/tabs/driver.html`;
                    
                const response = await fetch(driverHtmlPath);
                if (!response.ok) {
                    // Try alternative path as fallback
                    const altPath = `./html/tabs/driver.html`;
                    console.log(`Trying alternative path for driver: ${altPath}`);
                    const altResponse = await fetch(altPath);
                    if (!altResponse.ok) throw new Error(`Failed to load driver tab content: ${response.status}`);
                    const htmlContent = await altResponse.text();
                    driverTab.innerHTML = htmlContent;
                } else {
                    const htmlContent = await response.text();
                    driverTab.innerHTML = htmlContent;
                }
                driverTab.dataset.loaded = 'true';
                if (typeof window.initDriverTab === 'function') {
                    window.initDriverTab();
                }
            }
        }

        if (tabName === 'cleanup') {
            // Notify main process that cleanup tab is loaded
            // window.electronAPI.notifyCleanupTabLoaded(); // Removed this line
        }

    } catch (error) {
        console.error(`Error loading ${tabName} tab:`, error);
        showErrorNotification(`Failed to load ${tabName} tab: ${error.message}`);
    }
}

// Notification system
function showNotification(message, options = {}) {
    const toast = document.getElementById('notification-toast');
    const toastMessage = toast.querySelector('.toast-message');
    
    // Set message
    toastMessage.textContent = message;
    
    // Apply type-specific styling
    toast.className = 'notification-toast';
    if (options.type) {
        toast.classList.add(`notification-${options.type}`);
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

function showErrorNotification(message) {
    showNotification(message, { type: 'error', delay: 5000 });
}

// Make notification functions available globally
window.showNotification = showNotification;
window.showErrorNotification = showErrorNotification;
window.toggleTabVisibility = toggleTabVisibility;
window.toggleTabPin = toggleTabPin;

// FPS overlay functionality
let fpsIntervalId = null;
function showFpsOverlay(show) {
    const overlay = document.getElementById('fps-overlay');
    if (!overlay) return;
    if (show) {
        overlay.style.display = '';
        let lastFrame = performance.now();
        let frames = 0;
        let lastFps = 0;
        function updateFps() {
            frames++;
            const now = performance.now();
            if (now - lastFrame >= 1000) {
                lastFps = frames;
                document.getElementById('fps-value').textContent = lastFps;
                frames = 0;
                lastFrame = now;
            }
            if (overlay.style.display !== 'none') {
                requestAnimationFrame(updateFps);
            }
        }
        requestAnimationFrame(updateFps);
    } else {
        overlay.style.display = 'none';
        document.getElementById('fps-value').textContent = '0';
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

// Set up tab switching
function setupTabs() {
    // Set up tab switching
    const tabItems = document.querySelectorAll('.tab-item');
    tabItems.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            loadTabContent(tabName);
        });

        // Add context menu for tabs
        tab.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showTabContextMenu(e, tab);
        });
    });

    // Set up sidebar collapse/expand
    const sidebarFoldToggle = document.getElementById('sidebar-fold-toggle');
    if (sidebarFoldToggle) {
        sidebarFoldToggle.addEventListener('change', function(e) {
            setSidebarCollapsed(e.target.checked, false);
        });
    }

    // Make tabs draggable/reorderable
    const tabList = document.getElementById('winToolTabs');
    let draggedTab = null;
    let dragOverTab = null;

    // Restore saved tab order
    const savedOrder = JSON.parse(localStorage.getItem('tabOrder') || 'null');
    if (savedOrder && Array.isArray(savedOrder)) {
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

    function saveTabOrder() {
        const order = Array.from(tabList.children).map(tab => tab.dataset.tab);
        localStorage.setItem('tabOrder', JSON.stringify(order));
    }

    tabList.querySelectorAll('.tab-item').forEach(tab => {
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
            dragOverTab = tab;
        });
        tab.addEventListener('drop', (e) => {
            e.preventDefault();
            if (draggedTab && draggedTab !== tab) {
                tabList.insertBefore(draggedTab, tab.nextSibling);
                saveTabOrder();
            }
            tab.classList.remove('drag-over');
        });
        tab.addEventListener('dragenter', () => {
            tab.classList.add('drag-over');
        });
        tab.addEventListener('dragleave', () => {
            tab.classList.remove('drag-over');
        });
    });

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

// Privacy settings verification
async function verifyPrivacySettings() {
    try {
        // Request actual system privacy settings from the main process
        const systemSettings = await window.electronAPI.getSystemPrivacySettings();
        
        // Compare displayed vs actual settings
        const discrepancies = [];
        for (const [setting, value] of Object.entries(systemSettings)) {
            const displayedElement = document.querySelector(`[data-privacy-setting="${setting}"]`);
            if (displayedElement) {
                const displayedValue = displayedElement.classList.contains('enabled');
                if (displayedValue !== value) {
                    discrepancies.push({
                        setting,
                        displayed: displayedValue,
                        actual: value
                    });
                }
            }
        }

        // Show notification if discrepancies found
        if (discrepancies.length > 0) {
            showNotification('Some privacy settings display incorrect status. Please refresh the settings tab.', {
                type: 'warning',
                delay: 6000
            });
            console.warn('Privacy settings discrepancies:', discrepancies);
        }
    } catch (error) {
        console.error('Error verifying privacy settings:', error);
    }
}

// Add to window for global access
window.verifyPrivacySettings = verifyPrivacySettings;

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Apply accent color
    applySplashAccent();
    // Don't hide splash here - it will be hidden by dashboard.js when data is loaded

    // Set up window controls
    setupWindowControls();

    // Set up tab switching
    setupTabs();

    // Restore sidebar state from localStorage
    const savedCollapsed = localStorage.getItem('sidebarCollapsed');
    if (savedCollapsed === '1') {
        setSidebarCollapsed(true);
    }

    // Rotate splash screen status messages
    initSplashStatusMessages();

    // First, load the dashboard tab content in the background to start fetching data
    const dashboardTab = document.getElementById('tab-dashboard');
    
    // Use a path that works in both development and production
    const dashboardPath = window.location.href.includes('app.asar') 
        ? '../html/tabs/dashboard.html' 
        : 'html/tabs/dashboard.html';
    
    fetch(dashboardPath)
        .then(response => {
            if (!response.ok) {
                console.error(`Failed to load dashboard content: ${response.status}`);
                // Try alternative path as fallback
                const altPath = './html/tabs/dashboard.html';
                console.log(`Trying alternative path for dashboard: ${altPath}`);
                return fetch(altPath);
            }
            return response;
        })
        .then(response => {
            if (!response.ok) throw new Error(`Failed to load dashboard content: ${response.status}`);
            return response.text();
        })
        .then(htmlContent => {
            dashboardTab.innerHTML = htmlContent;
            dashboardTab.dataset.loaded = 'true';
            
            // Load dashboard script to start data fetching
            const script = document.createElement('script');
            script.src = 'js/tabs/dashboard.js';
            script.onload = () => {
                console.log('Loaded dashboard tab script in background');
                if (typeof window.initDashboardTab === 'function') {
                    try {
                        window.initDashboardTab();
                    } catch (error) {
                        console.error('Error initializing dashboard tab in background:', error);
                    }
                }
            };
            document.body.appendChild(script);
        })
        .catch(error => {
            console.error('Error loading dashboard tab in background:', error);
        });

    // Load the welcome tab as the visible default tab
    loadTabContent('welcome');
});

// Set up window controls for the custom title bar
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
            window.electronAPI.closeWindow();
        });
    }
}

// Initialize tab-specific functionality when a tab is loaded
document.addEventListener('tabLoaded', function(e) {
    const tabName = e.detail.tab;
    console.log(`Tab loaded event received for: ${tabName}`);
    
    // Call the appropriate initialization function based on the tab name
    const initFunctionName = `init${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`;
    if (typeof window[initFunctionName] === 'function') {
        console.log(`Calling ${initFunctionName}()`);
        try {
            window[initFunctionName]();
        } catch (error) {
            console.error(`Error initializing ${tabName} tab:`, error);
            showErrorNotification(`Error initializing ${tabName} tab: ${error.message}`);
        }
    } else {
        console.log(`No initialization function found for ${tabName} tab`);
    }
});
