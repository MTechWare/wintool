/**
 * WinTool - Main JavaScript File
 * Contains common functionality used across the application
 */

// Global variables and state
let currentTab = 'welcome';

// Splash screen functionality
function hideSplash() {
    const splash = document.getElementById('splash-screen');
    splash.style.opacity = 0;
    setTimeout(() => splash.style.display = 'none', 400);
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
    
    // If the tab content is already loaded, just switch to it
    if (tabContentElement.dataset.loaded === 'true') {
        switchTab(tabName);
        return;
    }
    
    try {
        // Fetch the HTML content
        const response = await fetch(`html/tabs/${tabName}.html`);
        if (!response.ok) {
            throw new Error(`Failed to load tab content: ${response.status}`);
        }
        
        const htmlContent = await response.text();
        tabContentElement.innerHTML = htmlContent;
        tabContentElement.dataset.loaded = 'true';
        
        // Remove AOS attributes to prevent disappearing content
        tabContentElement.removeAttribute('data-aos');
        
        // Switch to the tab first so content is visible
        switchTab(tabName);
        
        // Load and execute the tab's JavaScript
        const script = document.createElement('script');
        script.src = `js/tabs/${tabName}.js`;
        script.onload = () => {
            console.log(`Loaded ${tabName} tab script`);
            // If there's an init function for this tab, call it
            const initFunctionName = `init${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`;
            if (typeof window[initFunctionName] === 'function') {
                try {
                    window[initFunctionName]();
                } catch (error) {
                    console.error(`Error initializing ${tabName} tab:`, error);
                    showErrorNotification(`Error initializing ${tabName} tab: ${error.message}`);
                }
            }
        };
        script.onerror = (e) => {
            console.error(`Error loading ${tabName} tab script:`, e);
            showErrorNotification(`Failed to load ${tabName} tab script`);
        };
        document.body.appendChild(script);
    } catch (error) {
        console.error(`Error loading tab content for ${tabName}:`, error);
        tabContentElement.innerHTML = `<div class="error-message">Failed to load tab content: ${error.message}</div>`;
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

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Apply accent color and hide splash screen
    applySplashAccent();
    setTimeout(hideSplash, 1200);

    // Set up window controls
    setupWindowControls();

    // Set up tab switching
    setupTabs();

    // Restore sidebar state from localStorage
    const savedCollapsed = localStorage.getItem('sidebarCollapsed');
    if (savedCollapsed === '1') {
        setSidebarCollapsed(true);
    }

    // Load the initial tab (welcome)
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

// Set up tab switching
function setupTabs() {
    // Set up tab switching
    const tabItems = document.querySelectorAll('.tab-item');
    tabItems.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            loadTabContent(tabName);
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
