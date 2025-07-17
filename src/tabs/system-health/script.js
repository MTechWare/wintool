let healthUpdateInterval;
let memoryChart;
let memoryHistory = [];
const maxHistoryPoints = 60; // 1 minute of data at 1-second intervals
let isHealthDashboardActive = false; // Track if dashboard is currently active

// Cache for reducing redundant API calls
let lastHealthDataFetch = 0;
const HEALTH_DATA_CACHE_DURATION = 8000; // Cache for 8 seconds
let cachedHealthData = null;

// Debounce for refresh button
let refreshDebounceTimer = null;
const REFRESH_DEBOUNCE_DELAY = 2000; // 2 seconds

// Health thresholds
const HEALTH_THRESHOLDS = {
    memory: { warning: 80, critical: 95 },
    disk: { warning: 85, critical: 95 },
    temperature: { warning: 70, critical: 85 }
};

async function loadSystemHealth(container) {
    console.log('Loading system health dashboard...');

    try {
        // Initialize charts
        initializeCharts();

        // Setup event listeners first
        setupEventListeners(container);

        // Load initial data
        console.log('Loading initial health metrics...');
        await updateHealthMetrics();

        // Start real-time updates
        startHealthUpdates();

        console.log('System health dashboard loaded successfully');

        // Signal that the tab is ready
        if (window.markTabAsReady) {
            window.markTabAsReady('system-health');
        }
    } catch (error) {
        console.error('Error loading system health dashboard:', error);

        // Still mark as ready even if there's an error to prevent blocking
        if (window.markTabAsReady) {
            window.markTabAsReady('system-health');
        }
    }
}

function initializeCharts() {
    const memoryCanvas = document.getElementById('memory-chart');

    if (memoryCanvas) {
        const ctx = memoryCanvas.getContext('2d');

        // Simple chart implementation
        memoryChart = { canvas: memoryCanvas, ctx: ctx };

        drawChart(memoryChart, memoryHistory, 'Memory Usage %', '#10b981');
    }
}

function drawChart(chart, data, label, color) {
    const { canvas, ctx } = chart;
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--background-dark');
    ctx.fillRect(0, 0, width, height);
    
    if (data.length < 2) return;
    
    // Draw grid
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-color');
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
        const y = (height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // Draw data line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const stepX = width / (maxHistoryPoints - 1);
    const maxY = 100; // Percentage
    
    data.forEach((value, index) => {
        const x = index * stepX;
        const y = height - (value / maxY) * height;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Draw current value
    if (data.length > 0) {
        const currentValue = data[data.length - 1];
        ctx.fillStyle = color;
        ctx.font = '14px Arial';
        ctx.fillText(`${currentValue.toFixed(1)}%`, 10, 20);
    }
}

function startHealthUpdates() {
    // Prevent multiple intervals from being created
    if (isHealthDashboardActive || healthUpdateInterval) {
        console.log('Health updates already running, skipping...');
        return;
    }

    console.log('Starting System Health monitoring...');
    isHealthDashboardActive = true;

    // Start performance monitoring
    if (window.electronAPI) {
        window.electronAPI.startPerformanceUpdates();

        window.electronAPI.onPerformanceUpdate((metrics) => {
            updateRealTimeMetrics(metrics);
        });
    }

    // Update other metrics every 10 seconds (reduced frequency to lower CPU usage)
    healthUpdateInterval = setInterval(updateHealthMetrics, 10000);
}

function updateRealTimeMetrics(metrics) {
    // Update Memory
    const memValue = parseFloat(metrics.mem);
    updateCircularProgress('memory-progress', memValue);
    document.getElementById('memory-percentage').textContent = `${memValue.toFixed(1)}%`;
    document.getElementById('memory-status').textContent = getHealthStatus(memValue, HEALTH_THRESHOLDS.memory);
    document.getElementById('memory-status').className = `metric-status ${getHealthStatusClass(memValue, HEALTH_THRESHOLDS.memory)}`;

    // Update history
    memoryHistory.push(memValue);

    if (memoryHistory.length > maxHistoryPoints) {
        memoryHistory.shift();
    }

    // Redraw charts
    drawChart(memoryChart, memoryHistory, 'Memory Usage %', '#10b981');

    // Update overall status
    updateOverallStatus();
}

async function updateHealthMetrics() {
    try {
        if (!window.electronAPI) {
            console.warn('electronAPI not available');
            return;
        }

        const now = Date.now();

        // Check if we can use cached data to reduce CPU load
        if (cachedHealthData && (now - lastHealthDataFetch) < HEALTH_DATA_CACHE_DURATION) {
            console.log('Using cached health data to reduce CPU usage');
            const { systemInfo, networkStats } = cachedHealthData;
            updateSystemDetails(systemInfo);
            await updateDiskInfo(systemInfo);
            updateNetworkInfo(networkStats);
            return;
        }

        console.log('Fetching fresh lightweight system health info and network stats...');
        const [systemInfo, networkStats] = await Promise.all([
            window.electronAPI.getSystemHealthInfo(),
            window.electronAPI.getNetworkStats()
        ]);

        console.log('System health info received:', systemInfo);
        console.log('Network stats received:', networkStats);

        // Cache the data
        cachedHealthData = { systemInfo, networkStats };
        lastHealthDataFetch = now;

        // Update system details
        updateSystemDetails(systemInfo);

        // Update disk information
        await updateDiskInfo(systemInfo);

        // Update network information
        updateNetworkInfo(networkStats);

    } catch (error) {
        console.error('Error updating health metrics:', error);
    }
}

function updateSystemDetails(systemInfo) {
    console.log('Updating system details with:', systemInfo);

    // Memory details - use the formatted memory values
    const memUsedElement = document.getElementById('memory-used');
    if (memUsedElement) {
        if (systemInfo.usedMemory) {
            memUsedElement.textContent = systemInfo.usedMemory;
        } else {
            memUsedElement.textContent = 'N/A';
        }
    }

    const memAvailableElement = document.getElementById('memory-available');
    if (memAvailableElement) {
        if (systemInfo.availableMemory) {
            memAvailableElement.textContent = systemInfo.availableMemory;
        } else if (systemInfo.freeMemory) {
            memAvailableElement.textContent = systemInfo.freeMemory;
        } else {
            memAvailableElement.textContent = 'N/A';
        }
    }

    const memTotalElement = document.getElementById('memory-total');
    if (memTotalElement) {
        if (systemInfo.totalMemory) {
            memTotalElement.textContent = systemInfo.totalMemory;
        } else {
            memTotalElement.textContent = 'N/A';
        }
    }

    // Update memory percentage and progress circle
    const memPercentageElement = document.getElementById('memory-percentage');
    if (memPercentageElement && systemInfo.memoryUsagePercent !== undefined) {
        const memPercent = systemInfo.memoryUsagePercent;
        memPercentageElement.textContent = `${memPercent}%`;
        updateCircularProgress('memory-progress', memPercent);

        // Update memory status
        const memStatusElement = document.getElementById('memory-status');
        if (memStatusElement) {
            memStatusElement.textContent = getHealthStatus(memPercent, HEALTH_THRESHOLDS.memory);
            memStatusElement.className = `metric-status ${getHealthStatusClass(memPercent, HEALTH_THRESHOLDS.memory)}`;
        }
    }
}

async function updateDiskInfo(systemInfo) {
    try {
        if (window.electronAPI) {
            // Get real disk space data
            const diskData = await window.electronAPI.getDiskSpace();
            const { total, used, free } = diskData;

            // Calculate usage percentage
            const diskUsage = Math.round((used / total) * 100);

            // Update progress circle and percentage
            updateCircularProgress('disk-progress', diskUsage);
            document.getElementById('disk-percentage').textContent = `${diskUsage}%`;
            document.getElementById('disk-status').textContent = getHealthStatus(diskUsage, HEALTH_THRESHOLDS.disk);
            document.getElementById('disk-status').className = `metric-status ${getHealthStatusClass(diskUsage, HEALTH_THRESHOLDS.disk)}`;

            // Update disk space details with real data
            document.getElementById('disk-used').textContent = formatBytes(used);
            document.getElementById('disk-free').textContent = formatBytes(free);
            document.getElementById('disk-total').textContent = formatBytes(total);
        } else {
            // Fallback for browser testing - use mock data
            const diskUsage = 65; // Mock percentage
            updateCircularProgress('disk-progress', diskUsage);
            document.getElementById('disk-percentage').textContent = `${diskUsage}%`;
            document.getElementById('disk-status').textContent = getHealthStatus(diskUsage, HEALTH_THRESHOLDS.disk);
            document.getElementById('disk-status').className = `metric-status ${getHealthStatusClass(diskUsage, HEALTH_THRESHOLDS.disk)}`;

            document.getElementById('disk-used').textContent = '650 GB';
            document.getElementById('disk-free').textContent = '350 GB';
            document.getElementById('disk-total').textContent = '1 TB';
        }
    } catch (error) {
        console.error('Error updating disk info:', error);
        // Show error state
        document.getElementById('disk-percentage').textContent = 'Error';
        document.getElementById('disk-status').textContent = 'Error';
        document.getElementById('disk-used').textContent = 'Error';
        document.getElementById('disk-free').textContent = 'Error';
        document.getElementById('disk-total').textContent = 'Error';
    }
}

function updateNetworkInfo(networkStats) {
    try {
        if (networkStats && networkStats.totals) {
            document.getElementById('network-total-down').textContent = networkStats.totals.rx_bytes;
            document.getElementById('network-total-up').textContent = networkStats.totals.tx_bytes;
        }

        if (networkStats && networkStats.interfaces) {
            const activeInterfaces = networkStats.interfaces.filter(iface => iface.operstate === 'up').length;
            document.getElementById('network-interfaces').textContent = `${activeInterfaces} active`;

            // Calculate real-time speeds from active interfaces
            let totalDownloadSpeed = 0;
            let totalUploadSpeed = 0;
            let hasRealTimeData = false;

            networkStats.interfaces.forEach(iface => {
                if (iface.operstate === 'up' && iface.rx_sec && iface.tx_sec &&
                    iface.rx_sec !== 'N/A' && iface.tx_sec !== 'N/A') {
                    // Extract numeric values from formatted strings like "1.2 MB/s"
                    const rxMatch = iface.rx_sec.match(/^([\d.]+)\s*([KMGT]?B)/);
                    const txMatch = iface.tx_sec.match(/^([\d.]+)\s*([KMGT]?B)/);

                    if (rxMatch && txMatch) {
                        const rxValue = parseFloat(rxMatch[1]);
                        const rxUnit = rxMatch[2];
                        const txValue = parseFloat(txMatch[1]);
                        const txUnit = txMatch[2];

                        // Convert to bytes per second
                        const rxBytes = convertToBytes(rxValue, rxUnit);
                        const txBytes = convertToBytes(txValue, txUnit);

                        totalDownloadSpeed += rxBytes;
                        totalUploadSpeed += txBytes;
                        hasRealTimeData = true;
                    }
                }
            });

            // Update real-time speeds with actual data
            if (hasRealTimeData) {
                document.getElementById('network-download').textContent = formatBytesPerSecond(totalDownloadSpeed);
                document.getElementById('network-upload').textContent = formatBytesPerSecond(totalUploadSpeed);

                // Determine network status based on activity and connection
                let status = 'Disconnected';
                if (activeInterfaces > 0) {
                    const isActive = totalDownloadSpeed > 1024 || totalUploadSpeed > 1024; // More than 1KB/s
                    status = isActive ? 'Active' : 'Connected';
                }
                document.getElementById('network-status').textContent = status;
            } else {
                // Fallback when real-time data is not available (first call or no data)
                document.getElementById('network-download').textContent = activeInterfaces > 0 ? 'Monitoring...' : '0 B/s';
                document.getElementById('network-upload').textContent = activeInterfaces > 0 ? 'Monitoring...' : '0 B/s';
                document.getElementById('network-status').textContent = activeInterfaces > 0 ? 'Connected' : 'Disconnected';
            }
        } else {
            // No network data available
            document.getElementById('network-download').textContent = 'N/A';
            document.getElementById('network-upload').textContent = 'N/A';
            document.getElementById('network-status').textContent = 'Unknown';
        }
    } catch (error) {
        console.error('Error updating network info:', error);
        // Show error state
        document.getElementById('network-download').textContent = 'Error';
        document.getElementById('network-upload').textContent = 'Error';
        document.getElementById('network-status').textContent = 'Error';
    }
}



function updateCircularProgress(elementId, percentage) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const circle = element.querySelector('.progress-circle');
    const degrees = (percentage / 100) * 360;
    
    let color = '#10b981'; // Green
    if (percentage > 70) color = '#f59e0b'; // Yellow
    if (percentage > 90) color = '#ef4444'; // Red
    
    circle.style.background = `conic-gradient(${color} ${degrees}deg, var(--background-dark) ${degrees}deg)`;
}

function getHealthStatus(value, thresholds) {
    if (value >= thresholds.critical) return 'Critical';
    if (value >= thresholds.warning) return 'Warning';
    return 'Good';
}

function getHealthStatusClass(value, thresholds) {
    if (value >= thresholds.critical) return 'critical';
    if (value >= thresholds.warning) return 'warning';
    return '';
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Format bytes per second to human readable format
 */
function formatBytesPerSecond(bytesPerSecond) {
    if (bytesPerSecond === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Convert formatted size string to bytes
 */
function convertToBytes(value, unit) {
    const multipliers = {
        'B': 1,
        'KB': 1024,
        'MB': 1024 * 1024,
        'GB': 1024 * 1024 * 1024,
        'TB': 1024 * 1024 * 1024 * 1024
    };
    return value * (multipliers[unit] || 1);
}

function updateOverallStatus() {
    const memValue = parseFloat(document.getElementById('memory-percentage').textContent);

    let overallStatus = 'Excellent';
    let statusClass = '';
    let iconClass = 'fas fa-check-circle';

    if (memValue > 95) {
        overallStatus = 'Critical';
        statusClass = 'error';
        iconClass = 'fas fa-exclamation-circle';
    } else if (memValue > 80) {
        overallStatus = 'Warning';
        statusClass = 'warning';
        iconClass = 'fas fa-exclamation-triangle';
    } else if (memValue > 60) {
        overallStatus = 'Good';
    }
    
    const statusIcon = document.querySelector('.status-icon i');
    const statusText = document.getElementById('overall-status-text');
    
    if (statusIcon && statusText) {
        statusIcon.className = iconClass;
        statusIcon.parentElement.className = `status-icon ${statusClass}`;
        statusText.textContent = overallStatus;
    }
}

function setupEventListeners(container) {
    const refreshBtn = container.querySelector('#refresh-health-btn');
    const exportBtn = container.querySelector('#export-health-btn');

    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            // Debounce rapid clicks to prevent CPU spikes
            if (refreshDebounceTimer) {
                console.log('Refresh button clicked too quickly, ignoring...');
                return;
            }

            console.log('Refresh button clicked');
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            refreshBtn.disabled = true;

            // Clear cache to force fresh data
            cachedHealthData = null;
            lastHealthDataFetch = 0;

            try {
                await updateHealthMetrics();
                console.log('Health metrics updated successfully');
            } catch (error) {
                console.error('Error updating health metrics:', error);
            } finally {
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
                refreshBtn.disabled = false;

                // Set debounce timer
                refreshDebounceTimer = setTimeout(() => {
                    refreshDebounceTimer = null;
                }, REFRESH_DEBOUNCE_DELAY);
            }
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            exportHealthReport();
        });
    }
}

function exportHealthReport() {
    // Mock export functionality
    console.log('Exporting health report...');
    // Would implement actual export to CSV/JSON
}

// Cleanup function
function cleanupHealthDashboard() {
    if (!isHealthDashboardActive) {
        console.log('System Health Dashboard already cleaned up, skipping...');
        return;
    }

    console.log('Cleaning up System Health Dashboard...');
    isHealthDashboardActive = false;

    // Clear the health metrics interval
    if (healthUpdateInterval) {
        clearInterval(healthUpdateInterval);
        healthUpdateInterval = null;
    }

    // Clear cache and debounce timers
    cachedHealthData = null;
    lastHealthDataFetch = 0;
    if (refreshDebounceTimer) {
        clearTimeout(refreshDebounceTimer);
        refreshDebounceTimer = null;
    }

    // Stop performance monitoring to prevent CPU spikes
    if (window.electronAPI && window.electronAPI.stopPerformanceUpdates) {
        window.electronAPI.stopPerformanceUpdates();
    }

    console.log('System Health Dashboard cleanup completed');
}

// Export functions for tab system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { loadSystemHealth, cleanupHealthDashboard };
} else {
    window.loadSystemHealth = loadSystemHealth;
    window.cleanupHealthDashboard = cleanupHealthDashboard;
}

// Listen for tab changes to manage performance monitoring
if (window.tabEventManager) {
    window.tabEventManager.addEventListener('tabChanged', (event) => {
        const { tabId } = event.detail;
        if (tabId === 'system-health') {
            // Tab became active, start monitoring if not already started
            console.log('System Health tab activated');
            if (!isHealthDashboardActive) {
                console.log('Starting System Health monitoring...');
                startHealthUpdates();
            }
        } else if (isHealthDashboardActive) {
            // Tab became inactive and we're currently active, stop monitoring to prevent CPU spikes
            console.log('System Health tab deactivated, stopping monitoring...');
            cleanupHealthDashboard();
        }
    });
}

// Auto-initialize when the script loads
function initializeSystemHealth() {
    const container = document.querySelector('.folder-tab-container[data-tab="system-health"]');
    if (container) {
        console.log('System health container found, initializing...');
        loadSystemHealth(container);
    } else {
        console.log('System health container not found, retrying in 500ms...');
        setTimeout(initializeSystemHealth, 500);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing system health...');
    setTimeout(initializeSystemHealth, 100);
});

// Also try to initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
    console.log('DOM still loading, waiting for DOMContentLoaded...');
} else {
    console.log('DOM already loaded, initializing system health...');
    setTimeout(initializeSystemHealth, 100);
}

// Clean up when page unloads to prevent memory leaks
window.addEventListener('beforeunload', cleanupHealthDashboard);

// Clean up when page becomes hidden (e.g., minimized)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Page hidden, stopping System Health monitoring...');
        cleanupHealthDashboard();
    }
});