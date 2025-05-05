/**
 * WinTool - Dashboard Tab JavaScript
 * Handles functionality specific to the dashboard tab
 */

// Initialize elements
var sysOsEl = null;
var sysHostEl = null;
var sysUserEl = null;
var cpuUsageEl = null;
var ramUsageEl = null;
var cpuFillEl = null;
var ramFillEl = null;
var uptimeEl = null;
var updateInterval = null;

// Flag to track if data has been loaded
var dashboardDataLoaded = false;

// CPU and GPU detail elements
var cpuModelEl = null;
var cpuTempEl = null;
var cpuClockEl = null;
var cpuLoadEl = null;
var gpuModelEl = null;
var gpuTempEl = null;
var gpuMemoryEl = null;
var gpuLoadEl = null;

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

// Format bytes to human readable size
function formatBytes(bytes, decimals = 1) {
    if (!bytes) return '0 GB';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

// Update system information
async function updateSystemInfo() {
    try {
        // Only update if dashboard tab is visible or we're still loading initial data
        const dashboardTab = document.getElementById('tab-dashboard');
        if (!dashboardDataLoaded || (dashboardTab && dashboardTab.classList.contains('active'))) {
            let data;
            try {
                data = await window.electronAPI.getSystemInfo();
            } catch (error) {
                console.warn('Using mock data due to API error:', error);
                data = {
                    os: 'Mock OS',
                    hostname: 'Mock Hostname',
                    user: 'Mock User',
                    cpu: 50,
                    ram: {
                        used: 4294967296, // 4 GB
                        total: 8589934592 // 8 GB
                    },
                    uptime: 123456,
                    cpu_details: {
                        model: 'Mock CPU Model',
                        temp: 45,
                        clock: 3200,
                        load: 50
                    },
                    gpu_details: {
                        model: ['Mock GPU Model'],
                        temp: 60,
                        memory: 4096,
                        load: 40
                    }
                };
            }

            // Initialize elements if they haven't been cached yet
            if (!sysOsEl) sysOsEl = document.getElementById('sys-os');
            if (!sysHostEl) sysHostEl = document.getElementById('sys-host');
            if (!sysUserEl) sysUserEl = document.getElementById('sys-user');
            if (!cpuUsageEl) cpuUsageEl = document.getElementById('cpu-usage');
            if (!ramUsageEl) ramUsageEl = document.getElementById('ram-usage');
            if (!uptimeEl) uptimeEl = document.getElementById('dashboard-uptime');
            
            // Initialize progress bar elements
            if (!cpuFillEl) cpuFillEl = document.querySelector('.cpu-fill');
            if (!ramFillEl) ramFillEl = document.querySelector('.ram-fill');
            
            // Initialize CPU and GPU detail elements
            if (!cpuModelEl) cpuModelEl = document.getElementById('cpu-model');
            if (!cpuTempEl) cpuTempEl = document.getElementById('cpu-temp');
            if (!cpuClockEl) cpuClockEl = document.getElementById('cpu-clock');
            if (!cpuLoadEl) cpuLoadEl = document.getElementById('cpu-load');
            if (!gpuModelEl) gpuModelEl = document.getElementById('gpu-model');
            if (!gpuTempEl) gpuTempEl = document.getElementById('gpu-temp');
            if (!gpuMemoryEl) gpuMemoryEl = document.getElementById('gpu-memory');
            if (!gpuLoadEl) gpuLoadEl = document.getElementById('gpu-load');

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
            
            // Update uptime
            if (uptimeEl && data.uptime !== undefined) {
                uptimeEl.textContent = formatUptime(data.uptime);
            }
            
            // Update CPU details
            if (data.cpu_details) {
                if (cpuModelEl) cpuModelEl.innerText = data.cpu_details.model || 'Not available';
                if (cpuTempEl) {
                    const temp = data.cpu_details.temp;
                    cpuTempEl.innerText = (temp && temp > 0) ? `${temp}°C` : 'Not available';
                }
                if (cpuClockEl) {
                    const clock = data.cpu_details.clock;
                    cpuClockEl.innerText = (clock && clock > 0) ? `${clock} MHz` : 'Not available';
                }
                if (cpuLoadEl) {
                    const load = data.cpu_details.load;
                    cpuLoadEl.innerText = (load !== undefined && load >= 0) ? `${parseFloat(load).toFixed(1)}%` : 'Not available';
                }
            }
            
            // Update GPU details
            if (data.gpu_details) {
                if (gpuModelEl) {
                    // Handle GPU model as an array
                    if (Array.isArray(data.gpu_details.model)) {
                        // First try to find a high-end AMD or NVIDIA GPU
                        let primaryGpu = data.gpu_details.model.find(gpu => 
                            gpu && (
                                gpu.toLowerCase().includes('radeon rx') ||
                                gpu.toLowerCase().includes('geforce rtx') ||
                                gpu.toLowerCase().includes('radeon pro') ||
                                gpu.toLowerCase().includes('quadro')
                            )
                        );
                        
                        // If no high-end GPU found, try any dedicated GPU
                        if (!primaryGpu) {
                            primaryGpu = data.gpu_details.model.find(gpu => 
                                gpu && (
                                    (gpu.toLowerCase().includes('radeon') && !gpu.toLowerCase().includes('graphics')) ||
                                    gpu.toLowerCase().includes('geforce') ||
                                    gpu.toLowerCase().includes('nvidia') ||
                                    gpu.toLowerCase().includes('amd') && !gpu.toLowerCase().includes('processor')
                                ) && 
                                !gpu.toLowerCase().includes('intel') && 
                                !gpu.toLowerCase().includes('integrated') &&
                                !gpu.toLowerCase().includes('parsec')
                            );
                        }
                        
                        // Fallback to first GPU if no dedicated GPU found
                        if (!primaryGpu) {
                            primaryGpu = data.gpu_details.model[0] || 'Not available';
                        }
                        
                        gpuModelEl.innerText = primaryGpu;
                    } else {
                        gpuModelEl.innerText = data.gpu_details.model || 'Not available';
                    }
                }
                if (gpuTempEl) {
                    const temp = data.gpu_details.temp;
                    gpuTempEl.innerText = (temp && temp > 0) ? `${temp}°C` : 'Not available';
                }
                if (gpuMemoryEl) {
                    const memory = data.gpu_details.memory;
                    gpuMemoryEl.innerText = (memory && memory > 0) ? `${memory} MB` : 'Not available';
                }
                if (gpuLoadEl) {
                    const load = data.gpu_details.load;
                    gpuLoadEl.innerText = (load !== undefined && load >= 0) ? `${parseFloat(load).toFixed(1)}%` : 'Not available';
                }
            }
            
            // If this is the first successful data load, mark as loaded and hide splash
            if (!dashboardDataLoaded) {
                dashboardDataLoaded = true;
                console.log('Dashboard data loaded successfully, hiding splash screen');
                if (window.hideSplash) {
                    window.hideSplash();
                }
            }
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
async function initDashboardTab() {
    console.log('Initializing dashboard tab...');
    
    // Clear any existing intervals
    cleanupDashboardTab();
    
    try {
        // Do initial update
        await updateSystemInfo();
        
        // Set up periodic updates
        updateInterval = setInterval(async () => {
            if (document.getElementById('tab-dashboard').classList.contains('active')) {
                try {
                    await updateSystemInfo();
                } catch (error) {
                    console.error('Error updating system info:', error);
                    clearInterval(updateInterval);
                }
            }
        }, 2000);

        // Hide splash screen if it's still visible
        window.hideSplash?.();
        
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        const elements = ['sys-os', 'sys-host', 'sys-user', 'cpu-usage', 'ram-usage'];
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = 'Error loading data';
        });
    }
}

// Clean up when leaving the tab
function cleanupDashboardTab() {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }
    dashboardDataLoaded = false;
}

// Make functions globally available
window.initDashboardTab = initDashboardTab;
window.cleanupDashboardTab = cleanupDashboardTab;
