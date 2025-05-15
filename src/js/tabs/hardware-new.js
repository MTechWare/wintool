/**
 * WinTool - Hardware Monitor Tab JavaScript
 * Handles functionality specific to the hardware monitor tab
 */

// Button element
let openHardwareMonitorBtn = null;

// Debug flag - set to true to enable verbose logging
const DEBUG = true;

/**
 * Initialize the hardware tab
 * This function is called when the hardware tab is loaded
 */
function initHardwareTab() {
    console.log('Initializing hardware tab...');
    
    try {
        // Get the button element
        openHardwareMonitorBtn = document.getElementById('open-hardware-monitor');
        
        if (openHardwareMonitorBtn) {
            console.log('Hardware monitor button found, adding click listener');
            
            // Add click event listener
            openHardwareMonitorBtn.addEventListener('click', async () => {
                console.log('Hardware monitor button clicked');
                
                try {
                    // Check if electronAPI is available
                    if (!window.electronAPI) {
                        console.error('electronAPI is not available!');
                        alert('Error: Cannot open hardware monitor. electronAPI is not available.');
                        return;
                    }
                    
                    // Disable the button while opening the window
                    openHardwareMonitorBtn.disabled = true;
                    openHardwareMonitorBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Opening...';
                    
                    // Open the hardware monitor window
                    console.log('Opening hardware monitor window...');
                    const result = await window.electronAPI.openHardwareMonitor();
                    console.log('Hardware monitor window opened:', result);
                    
                    // Re-enable the button
                    setTimeout(() => {
                        openHardwareMonitorBtn.disabled = false;
                        openHardwareMonitorBtn.innerHTML = '<i class="fas fa-external-link-alt"></i> Open Hardware Monitor';
                    }, 1000);
                } catch (error) {
                    console.error('Error opening hardware monitor window:', error);
                    alert('Error opening hardware monitor: ' + error.message);
                    
                    // Re-enable the button
                    openHardwareMonitorBtn.disabled = false;
                    openHardwareMonitorBtn.innerHTML = '<i class="fas fa-external-link-alt"></i> Open Hardware Monitor';
                }
            });
        } else {
            console.error('Hardware monitor button not found');
        }
    } catch (error) {
        console.error('Error initializing hardware tab:', error);
    }
}

/**
 * Clean up the hardware tab
 * This function is called when the hardware tab is unloaded
 */
function cleanupHardwareTab() {
    console.log('Cleaning up hardware tab...');
    
    // Remove event listeners
    if (openHardwareMonitorBtn) {
        openHardwareMonitorBtn.removeEventListener('click', () => {});
    }
}

// Make functions globally available
window.initHardwareTab = initHardwareTab;
window.cleanupHardwareTab = cleanupHardwareTab;

// Initialize the hardware tab when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired in hardware.js');
    
    // Find the hardware tab item
    const hardwareTabItem = document.querySelector('.tab-item[data-tab="hardware"]');
    
    if (hardwareTabItem) {
        console.log('Hardware tab item found, adding click listener');
        
        // Add click event listener
        hardwareTabItem.addEventListener('click', () => {
            console.log('Hardware tab clicked');
            
            // Get the tab content element
            const tabContent = document.getElementById('tab-hardware');
            
            // Check if the tab is already loaded
            if (tabContent && tabContent.getAttribute('data-loaded') !== 'true') {
                console.log('Hardware tab not loaded, initializing...');
                
                // Initialize the hardware tab
                initHardwareTab();
                
                // Mark the tab as loaded
                tabContent.setAttribute('data-loaded', 'true');
            }
        });
    } else {
        console.error('Hardware tab item not found');
    }
});
