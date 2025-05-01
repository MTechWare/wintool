/**
 * WinTool - Settings Tab JavaScript
 * Handles functionality specific to the settings tab
 */

// Default accent color
const defaultAccent = '#ff9800';

// Initialize the settings tab
function initSettingsTab() {
    console.log('Settings tab initialized');
    
    // Set up theme selector
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.addEventListener('change', function() {
            // Theme change logic here
            console.log('Theme changed to:', this.value);
        });
    }
    
    // Set up sidebar fold toggle
    const sidebarFoldToggle = document.getElementById('sidebar-fold-toggle');
    if (sidebarFoldToggle) {
        // Set initial state from localStorage
        const savedCollapsed = localStorage.getItem('sidebarCollapsed');
        sidebarFoldToggle.checked = savedCollapsed === '1';
        
        // Add event listener
        sidebarFoldToggle.addEventListener('change', function() {
            setSidebarCollapsed(this.checked, false);
        });
    }
    
    // Set up FPS counter toggle
    const fpsToggle = document.getElementById('fps-counter-toggle');
    if (fpsToggle) {
        // Set initial state
        fpsToggle.checked = localStorage.getItem('fpsCounter') === '1';
        
        // Add event listener
        fpsToggle.addEventListener('change', function() {
            showFpsOverlay(this.checked);
            localStorage.setItem('fpsCounter', this.checked ? '1' : '0');
        });
    }
    
    // Set up always on top toggle
    const alwaysOnTopToggle = document.getElementById('alwaysOnTopToggle');
    if (alwaysOnTopToggle) {
        // Set initial state
        alwaysOnTopToggle.checked = localStorage.getItem('alwaysOnTop') === '1';
        
        // Add event listener
        alwaysOnTopToggle.addEventListener('change', function() {
            if (window.electronAPI && window.electronAPI.setAlwaysOnTop) {
                window.electronAPI.setAlwaysOnTop(this.checked);
                localStorage.setItem('alwaysOnTop', this.checked ? '1' : '0');
            }
        });
    }
    
    // Set up accent color picker
    const accentColorPicker = document.getElementById('accent-color-picker');
    if (accentColorPicker) {
        // Set initial color from localStorage
        const savedColor = localStorage.getItem('accentColor') || '#ff9800';
        accentColorPicker.value = savedColor;
        
        // Live preview on input
        accentColorPicker.addEventListener('input', function() {
            document.documentElement.style.setProperty('--primary', this.value);
            // Live update active tab color
            const activeTab = document.querySelector('.tab-item.active');
            if (activeTab) {
                activeTab.style.backgroundColor = this.value;
            }
        });
        // Wait until user picks a color (commits change)
        accentColorPicker.addEventListener('change', function() {
            localStorage.setItem('accentColor', this.value);
            if (window.electronAPI && window.electronAPI.reloadWindow) {
                window.electronAPI.reloadWindow();
            } else {
                window.location.reload();
            }
        });
    }
    
    // Set up reset accent color button
    const resetAccentBtn = document.getElementById('reset-accent-color-btn');
    if (resetAccentBtn) {
        resetAccentBtn.addEventListener('click', function() {
            const defaultColor = '#ff9800';
            document.documentElement.style.setProperty('--primary', defaultColor);
            localStorage.setItem('accentColor', defaultColor);
            if (accentColorPicker) {
                accentColorPicker.value = defaultColor;
            }
            
            // Update active tab color
            const activeTab = document.querySelector('.tab-item.active');
            if (activeTab) {
                activeTab.style.backgroundColor = defaultColor;
            }
            if (window.electronAPI && window.electronAPI.reloadWindow) {
                window.electronAPI.reloadWindow();
            } else {
                window.location.reload();
            }
        });
    }
    
    // Set up reset tab order button
    const resetTabOrderBtn = document.getElementById('reset-tab-order-btn');
    if (resetTabOrderBtn) {
        resetTabOrderBtn.addEventListener('click', function() {
            localStorage.removeItem('tabOrder');
            showNotification('Tab order has been reset to default. Please restart the application.');
        });
    }
    
    // Set up check for updates button
    const checkUpdatesBtn = document.getElementById('check-updates');
    if (checkUpdatesBtn) {
        checkUpdatesBtn.addEventListener('click', function() {
            showNotification('Checking for updates...');
            // Simulate update check
            setTimeout(() => {
                showNotification('You are using the latest version.');
            }, 1500);
        });
    }
    
    // Set up reset all settings button
    const resetAllBtn = document.getElementById('reset-all-settings');
    if (resetAllBtn) {
        resetAllBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to reset all settings? This cannot be undone.')) {
                // Clear all settings from localStorage
                localStorage.removeItem('accentColor');
                localStorage.removeItem('tabOrder');
                localStorage.removeItem('sidebarCollapsed');
                localStorage.removeItem('fpsCounter');
                localStorage.removeItem('alwaysOnTop');
                
                showNotification('All settings have been reset to default. Restarting the application...');
                setTimeout(() => {
                    if (window.electronAPI && window.electronAPI.restartApp) {
                        window.electronAPI.restartApp();
                    } else {
                        window.location.reload();
                    }
                }, 1200);
            }
        });
    }
}

// Export the initialization function
window.initSettingsTab = initSettingsTab;
