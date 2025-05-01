/**
 * WinTool - Dashboard Tab JavaScript
 * Handles functionality specific to the dashboard tab
 */

// Initialize elements
let sysOsEl = null;
let sysHostEl = null;
let sysUserEl = null;
let cpuUsageEl = null;
let ramUsageEl = null;
let diskUsageEl = null;
let cpuFillEl = null;
let ramFillEl = null;
let diskFillEl = null;
let uptimeEl = null;
let updateInterval = null;

// Format uptime in days, hours, minutes, seconds
function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    let str = '';
    if (d) str += `${d}d `;
    if (h) str += `${h}h `;
    if (m) str += `${m}m `;
    str += `${s}s`;
    return str;
}

// Update system information
async function updateSystemInfo() {
    try {
        // Only update if dashboard tab is visible
        const dashboardTab = document.getElementById('tab-dashboard');
        if (!dashboardTab || !dashboardTab.classList.contains('active')) {
            return;
        }

        const data = await window.electronAPI.getSystemInfo();
        if (!data) return;

        // Initialize elements if they haven't been cached yet
        if (!sysOsEl) sysOsEl = document.getElementById('sys-os');
        if (!sysHostEl) sysHostEl = document.getElementById('sys-host');
        if (!sysUserEl) sysUserEl = document.getElementById('sys-user');
        if (!cpuUsageEl) cpuUsageEl = document.getElementById('cpu-usage');
        if (!ramUsageEl) ramUsageEl = document.getElementById('ram-usage');
        if (!diskUsageEl) diskUsageEl = document.getElementById('disk-usage');
        if (!uptimeEl) uptimeEl = document.getElementById('dashboard-uptime');
        
        // Initialize progress bar elements
        if (!cpuFillEl) cpuFillEl = document.querySelector('.cpu-fill');
        if (!ramFillEl) ramFillEl = document.querySelector('.ram-fill');
        if (!diskFillEl) diskFillEl = document.querySelector('.disk-fill');

        // Update system info
        if (sysOsEl) sysOsEl.innerText = data.os || 'Not available';
        if (sysHostEl) sysHostEl.innerText = data.hostname || 'Not available';
        if (sysUserEl) sysUserEl.innerText = data.user || 'Not available';
        
        // Update CPU usage with progress bar
        if (cpuUsageEl && data.cpu !== undefined) {
            const cpuPercent = data.cpu.toFixed(1);
            cpuUsageEl.innerText = `${cpuPercent}%`;
            if (cpuFillEl) {
                cpuFillEl.style.width = `${cpuPercent}%`;
            }
        }
        
        // Update RAM usage with progress bar
        if (ramUsageEl && data.ram && data.ram.used !== undefined && data.ram.total !== undefined) {
            const usedGB = (data.ram.used/1073741824).toFixed(1);
            const totalGB = (data.ram.total/1073741824).toFixed(1);
            const ramPercent = ((data.ram.used / data.ram.total) * 100).toFixed(1);
            ramUsageEl.innerText = `${usedGB} GB / ${totalGB} GB (${ramPercent}%)`;
            if (ramFillEl) {
                ramFillEl.style.width = `${ramPercent}%`;
            }
        }
        
        // Update Disk usage with progress bar
        if (diskUsageEl && data.disk && data.disk.percent !== undefined) {
            diskUsageEl.innerText = `${data.disk.percent}%`;
            if (diskFillEl) {
                diskFillEl.style.width = `${data.disk.percent}%`;
            }
        }
        
        // Update uptime
        if (uptimeEl && data.uptime_seconds !== undefined) {
            uptimeEl.textContent = formatUptime(data.uptime_seconds);
        }
    } catch (error) {
        console.error("Error updating system info:", error);
    }
}

// Quick actions handler
async function quickAction(action) {
    try {
        // Show loading state
        const btn = document.querySelector(`.quick-action-btn[onclick="quickAction('${action}')"]`);
        if (btn) {
            btn.classList.add('loading');
            const originalLabel = btn.querySelector('.action-label').innerText;
            btn.querySelector('.action-label').innerText = 'Loading...';
            
            // Restore after action completes
            setTimeout(() => {
                btn.classList.remove('loading');
                btn.querySelector('.action-label').innerText = originalLabel;
            }, 2000);
        }
        
        // Execute action
        switch (action) {
            case 'disk_cleanup':
                await window.electronAPI.launchDiskCleanup();
                break;
            case 'task_manager':
                await window.electronAPI.launchTaskManager();
                break;
            case 'security_center':
                await window.electronAPI.launchSystemTool('security_center');
                break;
            case 'power_options':
                await window.electronAPI.launchSystemTool('power_options');
                break;
            default:
                showNotification('Unknown quick action: ' + action, 'error');
        }
    } catch (error) {
        console.error("Error executing quick action:", error);
        showNotification('Failed to execute action: ' + error.message, 'error');
    }
}

// Initialize the dashboard tab
function initDashboardTab() {
    console.log('Dashboard tab initialized');
    
    // Clear any existing intervals to prevent duplicates
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    
    // Start system info updates
    updateSystemInfo();
    updateInterval = setInterval(updateSystemInfo, 2000);
    
    // Make the quick action function globally available
    window.quickAction = quickAction;
    
    // Add hover animations to cards
    const cards = document.querySelectorAll('.dashboard-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-5px)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });
}

// Clean up when leaving the tab
function cleanupDashboardTab() {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }
}

// Export the initialization function
window.initDashboardTab = initDashboardTab;
window.cleanupDashboardTab = cleanupDashboardTab;
