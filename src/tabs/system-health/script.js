let healthUpdateInterval;
let cpuChart, memoryChart;
let cpuHistory = [];
let memoryHistory = [];
const maxHistoryPoints = 60; // 1 minute of data at 1-second intervals

// Health thresholds
const HEALTH_THRESHOLDS = {
    cpu: { warning: 70, critical: 90 },
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
    const cpuCanvas = document.getElementById('cpu-chart');
    const memoryCanvas = document.getElementById('memory-chart');
    
    if (cpuCanvas && memoryCanvas) {
        const ctx1 = cpuCanvas.getContext('2d');
        const ctx2 = memoryCanvas.getContext('2d');
        
        // Simple chart implementation
        cpuChart = { canvas: cpuCanvas, ctx: ctx1 };
        memoryChart = { canvas: memoryCanvas, ctx: ctx2 };
        
        drawChart(cpuChart, cpuHistory, 'CPU Usage %', '#3b82f6');
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
    if (healthUpdateInterval) {
        clearInterval(healthUpdateInterval);
    }
    
    // Start performance monitoring
    if (window.electronAPI) {
        window.electronAPI.startPerformanceUpdates();
        
        window.electronAPI.onPerformanceUpdate((metrics) => {
            updateRealTimeMetrics(metrics);
        });
    }
    
    // Update other metrics every 5 seconds
    healthUpdateInterval = setInterval(updateHealthMetrics, 5000);
}

function updateRealTimeMetrics(metrics) {
    // Update CPU
    const cpuValue = parseFloat(metrics.cpu);
    updateCircularProgress('cpu-progress', cpuValue);
    document.getElementById('cpu-percentage').textContent = `${cpuValue.toFixed(1)}%`;
    document.getElementById('cpu-status').textContent = getHealthStatus(cpuValue, HEALTH_THRESHOLDS.cpu);
    document.getElementById('cpu-status').className = `metric-status ${getHealthStatusClass(cpuValue, HEALTH_THRESHOLDS.cpu)}`;
    
    // Update Memory
    const memValue = parseFloat(metrics.mem);
    updateCircularProgress('memory-progress', memValue);
    document.getElementById('memory-percentage').textContent = `${memValue.toFixed(1)}%`;
    document.getElementById('memory-status').textContent = getHealthStatus(memValue, HEALTH_THRESHOLDS.memory);
    document.getElementById('memory-status').className = `metric-status ${getHealthStatusClass(memValue, HEALTH_THRESHOLDS.memory)}`;
    
    // Update history
    cpuHistory.push(cpuValue);
    memoryHistory.push(memValue);
    
    if (cpuHistory.length > maxHistoryPoints) {
        cpuHistory.shift();
        memoryHistory.shift();
    }
    
    // Redraw charts
    drawChart(cpuChart, cpuHistory, 'CPU Usage %', '#3b82f6');
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

        console.log('Fetching system info and network stats...');
        const [systemInfo, networkStats] = await Promise.all([
            window.electronAPI.getSystemInfo(),
            window.electronAPI.getNetworkStats()
        ]);

        console.log('System info received:', systemInfo);
        console.log('Network stats received:', networkStats);

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

    // CPU Temperature - try multiple sources
    const tempElement = document.getElementById('cpu-temp');
    if (tempElement) {
        if (systemInfo.cpuTemperature && systemInfo.cpuTemperature !== 'N/A') {
            tempElement.textContent = systemInfo.cpuTemperature;
        } else {
            tempElement.textContent = 'N/A';
        }
    }

    // CPU Speed - try current speed first, then fall back to base speed
    const speedElement = document.getElementById('cpu-speed');
    if (speedElement) {
        if (systemInfo.cpuCurrentSpeed && systemInfo.cpuCurrentSpeed !== 'N/A') {
            speedElement.textContent = systemInfo.cpuCurrentSpeed;
        } else if (systemInfo.cpuSpeed) {
            speedElement.textContent = systemInfo.cpuSpeed;
        } else {
            speedElement.textContent = 'N/A';
        }
    }

    // CPU Cores
    const coresElement = document.getElementById('cpu-cores');
    if (coresElement) {
        if (systemInfo.cpuCores) {
            coresElement.textContent = systemInfo.cpuCores.toString();
        } else {
            coresElement.textContent = 'N/A';
        }
    }

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
    const cpuValue = parseFloat(document.getElementById('cpu-percentage').textContent);
    const memValue = parseFloat(document.getElementById('memory-percentage').textContent);
    
    let overallStatus = 'Excellent';
    let statusClass = '';
    let iconClass = 'fas fa-check-circle';
    
    if (cpuValue > 90 || memValue > 95) {
        overallStatus = 'Critical';
        statusClass = 'error';
        iconClass = 'fas fa-exclamation-circle';
    } else if (cpuValue > 70 || memValue > 80) {
        overallStatus = 'Warning';
        statusClass = 'warning';
        iconClass = 'fas fa-exclamation-triangle';
    } else if (cpuValue > 50 || memValue > 60) {
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
            console.log('Refresh button clicked');
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            try {
                await updateHealthMetrics();
                console.log('Health metrics updated successfully');
            } catch (error) {
                console.error('Error updating health metrics:', error);
            } finally {
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
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
    if (healthUpdateInterval) {
        clearInterval(healthUpdateInterval);
        healthUpdateInterval = null;
    }
}

// Export functions for tab system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { loadSystemHealth, cleanupHealthDashboard };
} else {
    window.loadSystemHealth = loadSystemHealth;
    window.cleanupHealthDashboard = cleanupHealthDashboard;
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