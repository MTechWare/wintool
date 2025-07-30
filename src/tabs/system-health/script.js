let healthUpdateInterval;
let memoryChart;
let memoryHistory = [];
const maxHistoryPoints = 60;
let isHealthDashboardActive = false;

let lastHealthDataFetch = 0;
const HEALTH_DATA_CACHE_DURATION = 20000;
let cachedHealthData = null;

let refreshDebounceTimer = null;
const REFRESH_DEBOUNCE_DELAY = 2000;

let HEALTH_THRESHOLDS = {
    memory: { warning: 80, critical: 95 },
    disk: { warning: 85, critical: 95 },
    temperature: { warning: 70, critical: 85 },
};

let activeAlerts = new Map();
let alertHistory = [];
let alertSettings = {
    enableSound: true,
    enableDesktopNotifications: true,
    autoDismissInfo: true,
    enableNativeNotifications: true,
    persistentCriticalAlerts: true,
    refreshInterval: 15,
};

const ALERT_SEVERITY = {
    INFO: 'info',
    WARNING: 'warning',
    CRITICAL: 'critical',
};

const ALERT_ICONS = {
    info: 'fas fa-info-circle',
    warning: 'fas fa-exclamation-triangle',
    critical: 'fas fa-exclamation-circle',
};

async function loadSystemHealth(container) {
    try {
        // Initialize alert system (this loads settings including refresh interval)
        initializeAlertSystem();

        // Initialize charts
        initializeCharts();

        // Setup event listeners first
        setupEventListeners(container);

        // Load initial data
        await updateHealthMetrics();

        // Start real-time updates (now uses loaded refresh interval setting)
        startHealthUpdates();

        // Signal that the tab is ready
        if (window.markTabAsReady) {
            window.markTabAsReady('system-health');
        }
    } catch (error) {
        window.electronAPI.logError(
            `Error loading system health dashboard: ${error.message}`,
            'SystemHealthTab'
        );

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
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(
        '--background-dark'
    );
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
        return;
    }

    isHealthDashboardActive = true;

    // Start performance monitoring with user-configured interval
    if (window.electronAPI) {
        // Stop any existing performance updates first
        window.electronAPI.stopPerformanceUpdates();

        // Start performance updates
        window.electronAPI.startPerformanceUpdates();

        // Set up throttled performance updates based on user's refresh rate
        let lastPerformanceUpdate = 0;
        const performanceThrottleMs = (alertSettings.refreshInterval || 15) * 1000;

        window.electronAPI.onPerformanceUpdate(metrics => {
            const now = Date.now();
            if (now - lastPerformanceUpdate >= performanceThrottleMs) {
                updateRealTimeMetrics(metrics);
                lastPerformanceUpdate = now;
            }
        });
    }

    // Update other metrics based on user-configured refresh interval
    const refreshIntervalMs = (alertSettings.refreshInterval || 15) * 1000;
    healthUpdateInterval = setInterval(updateHealthMetrics, refreshIntervalMs);
}

function updateRealTimeMetrics(metrics) {
    // Update Memory
    const memValue = parseFloat(metrics.mem);
    updateCircularProgress('memory-progress', memValue);
    document.getElementById('memory-percentage').textContent = `${memValue.toFixed(1)}%`;
    document.getElementById('memory-status').textContent = getHealthStatus(
        memValue,
        HEALTH_THRESHOLDS.memory
    );
    document.getElementById('memory-status').className =
        `metric-status ${getHealthStatusClass(memValue, HEALTH_THRESHOLDS.memory)}`;

    // Check memory thresholds for alerts
    checkMetricThresholds('memory', memValue, '%');

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
            return;
        }

        const now = Date.now();

        // Check if we can use cached data to reduce CPU load
        if (cachedHealthData && now - lastHealthDataFetch < HEALTH_DATA_CACHE_DURATION) {
            const { systemInfo } = cachedHealthData;
            updateSystemDetails(systemInfo);
            await updateDiskInfo(systemInfo);
            return;
        }

        const systemInfo = await window.electronAPI.getSystemHealthInfo();

        // Cache the data
        cachedHealthData = { systemInfo };
        lastHealthDataFetch = now;

        // Update system details
        updateSystemDetails(systemInfo);

        // Update disk information
        await updateDiskInfo(systemInfo);
    } catch (error) {
        window.electronAPI.logError(
            `Error updating health metrics: ${error.message}`,
            'SystemHealthTab'
        );
    }
}

function updateSystemDetails(systemInfo) {
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
            document.getElementById('disk-status').textContent = getHealthStatus(
                diskUsage,
                HEALTH_THRESHOLDS.disk
            );
            document.getElementById('disk-status').className =
                `metric-status ${getHealthStatusClass(diskUsage, HEALTH_THRESHOLDS.disk)}`;

            // Check disk thresholds for alerts
            checkMetricThresholds('disk', diskUsage, '%');

            // Update disk space details with real data
            document.getElementById('disk-used').textContent = formatBytes(used);
            document.getElementById('disk-free').textContent = formatBytes(free);
            document.getElementById('disk-total').textContent = formatBytes(total);

            document.getElementById('disk-status').className =
                `metric-status ${getHealthStatusClass(diskUsage, HEALTH_THRESHOLDS.disk)}`;

            // Check disk thresholds for alerts (even in fallback mode)
            checkMetricThresholds('disk', diskUsage, '%');
        } else {
            // Fallback values for browser testing
            const diskUsage = 65; // Mock percentage
            updateCircularProgress('disk-progress', diskUsage);
            document.getElementById('disk-percentage').textContent = `${diskUsage}%`;
            document.getElementById('disk-status').textContent = getHealthStatus(diskUsage, HEALTH_THRESHOLDS.disk);
            document.getElementById('disk-status').className =
                `metric-status ${getHealthStatusClass(diskUsage, HEALTH_THRESHOLDS.disk)}`;

            // Check disk thresholds for alerts (even in fallback mode)
            checkMetricThresholds('disk', diskUsage, '%');

            document.getElementById('disk-used').textContent = '650 GB';
            document.getElementById('disk-free').textContent = '350 GB';
            document.getElementById('disk-total').textContent = '1 TB';
        }
    } catch (error) {
        window.electronAPI.logError(
            `Error updating disk info: ${error.message}`,
            'SystemHealthTab'
        );
        // Show error state
        document.getElementById('disk-percentage').textContent = 'Error';
        document.getElementById('disk-status').textContent = 'Error';
        document.getElementById('disk-used').textContent = 'Error';
        document.getElementById('disk-free').textContent = 'Error';
        document.getElementById('disk-total').textContent = 'Error';
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
    const alertSettingsBtn = container.querySelector('#alert-settings-btn');
    const refreshBtn = container.querySelector('#refresh-health-btn');
    const exportBtn = container.querySelector('#export-health-btn');
    const clearAlertsBtn = container.querySelector('#clear-alerts-btn');
    const alertHistoryBtn = container.querySelector('#alert-history-btn');

    // Alert section buttons (with different IDs to avoid conflicts)
    const alertsSettingsBtn = container.querySelector('#alerts-settings-btn');
    const alertsClearBtn = container.querySelector('#alerts-clear-btn');
    const alertsHistoryBtn = container.querySelector('#alerts-history-btn');

    if (alertSettingsBtn && !alertSettingsBtn.hasAttribute('data-listener-attached')) {
        alertSettingsBtn.addEventListener('click', openAlertSettings);
        alertSettingsBtn.setAttribute('data-listener-attached', 'true');
    }

    if (refreshBtn && !refreshBtn.hasAttribute('data-listener-attached')) {
        refreshBtn.addEventListener('click', async () => {
            // Debounce rapid clicks to prevent CPU spikes
            if (refreshDebounceTimer) {
                return;
            }
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            refreshBtn.disabled = true;

            // Clear cache to force fresh data
            cachedHealthData = null;
            lastHealthDataFetch = 0;

            try {
                await updateHealthMetrics();
            } catch (error) {
                window.electronAPI.logError(
                    `Error updating health metrics: ${error.message}`,
                    'SystemHealthTab'
                );
            } finally {
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
                refreshBtn.disabled = false;

                // Set debounce timer
                refreshDebounceTimer = setTimeout(() => {
                    refreshDebounceTimer = null;
                }, REFRESH_DEBOUNCE_DELAY);
            }
        });
        refreshBtn.setAttribute('data-listener-attached', 'true');
    }

    if (exportBtn && !exportBtn.hasAttribute('data-listener-attached')) {
        exportBtn.addEventListener('click', () => {
            exportHealthReport();
        });
        exportBtn.setAttribute('data-listener-attached', 'true');
    }

    if (clearAlertsBtn) {
        clearAlertsBtn.addEventListener('click', clearAllAlerts);
    }

    if (alertHistoryBtn) {
        alertHistoryBtn.addEventListener('click', openAlertHistory);
    }

    // Alert section buttons event listeners
    if (alertsSettingsBtn) {
        alertsSettingsBtn.addEventListener('click', openAlertSettings);
    }

    if (alertsClearBtn) {
        alertsClearBtn.addEventListener('click', clearAllAlerts);
    }

    if (alertsHistoryBtn) {
        alertsHistoryBtn.addEventListener('click', openAlertHistory);
    }

    // Setup modal event listeners
    setupModalEventListeners();


}

async function exportHealthReport() {
    try {
        // Gather current system health data
        const healthData = await gatherHealthReportData();

        // Create the report content
        const reportContent = generateHealthReportContent(healthData);

        // Create and download the file
        downloadHealthReport(reportContent, healthData.timestamp);

        // Show success notification
        if (window.showNotification) {
            window.showNotification('Health report exported successfully!', 'success');
        }
    } catch (error) {
        window.electronAPI.logError(
            `Error exporting health report: ${error.message}`,
            'SystemHealthTab'
        );
        if (window.showNotification) {
            window.showNotification('Failed to export health report', 'error');
        }
    }
}

async function gatherHealthReportData() {
    const timestamp = new Date().toISOString();
    const data = {
        timestamp,
        exportTime: new Date().toLocaleString(),
        systemInfo: {},
        healthMetrics: {},
        alerts: {
            active: Array.from(activeAlerts.values()),
            history: alertHistory.slice(0, 50), // Last 50 alerts
        },
        settings: {
            thresholds: HEALTH_THRESHOLDS,
            alertSettings: alertSettings,
        },
    };

    try {
        // Get system information if available
        if (window.electronAPI) {
            const systemInfo = await window.electronAPI.getSystemInfo();
            data.systemInfo = {
                platform: systemInfo.platform,
                arch: systemInfo.arch,
                hostname: systemInfo.hostname,
                uptime: systemInfo.uptime,
                memory: {
                    total: systemInfo.totalMemory,
                    used: systemInfo.usedMemory,
                    usagePercent: systemInfo.memoryUsagePercent,
                },
                cpu: {
                    model: systemInfo.cpuModel,
                    cores: systemInfo.cpuCores,
                    speed: systemInfo.cpuSpeed,
                },
            };

            // Get current performance metrics
            const performanceData = await window.electronAPI.getPerformanceData();
            if (performanceData) {
                data.healthMetrics = {
                    memory: {
                        usage: parseFloat(performanceData.mem),
                        status: getHealthStatus(
                            parseFloat(performanceData.mem),
                            HEALTH_THRESHOLDS.memory
                        ),
                    },
                    disk: {
                        usage: parseFloat(performanceData.disk || 0),
                        status: getHealthStatus(
                            parseFloat(performanceData.disk || 0),
                            HEALTH_THRESHOLDS.disk
                        ),
                    },
                };
            }
        }

        // Get current UI values
        const memoryPercentage = document.getElementById('memory-percentage')?.textContent || 'N/A';
        const diskPercentage = document.getElementById('disk-percentage')?.textContent || 'N/A';
        const overallStatus =
            document.getElementById('overall-status-text')?.textContent || 'Unknown';

        data.currentStatus = {
            overall: overallStatus,
            memory: memoryPercentage,
            disk: diskPercentage,
        };
    } catch (error) {
        window.electronAPI.logWarn(
            `Some health data could not be gathered: ${error.message}`,
            'SystemHealthTab'
        );
    }

    return data;
}

function generateHealthReportContent(data) {
    const report = {
        metadata: {
            title: 'System Health Report',
            exportTime: data.exportTime,
            timestamp: data.timestamp,
            version: '2.4.0',
        },
        systemInformation: data.systemInfo,
        currentStatus: data.currentStatus,
        healthMetrics: data.healthMetrics,
        alerts: {
            activeCount: data.alerts.active.length,
            activeAlerts: data.alerts.active,
            recentHistory: data.alerts.history,
        },
        configuration: {
            healthThresholds: data.settings.thresholds,
            alertSettings: data.settings.alertSettings,
        },
    };

    return JSON.stringify(report, null, 2);
}

function downloadHealthReport(content, timestamp) {
    // Create filename with timestamp
    const date = new Date(timestamp);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    const filename = `system-health-report_${dateStr}_${timeStr}.json`;

    // Create blob and download
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    URL.revokeObjectURL(url);
}

// Alert System Functions
function initializeAlertSystem() {
    // Load saved settings
    loadAlertSettings();

    // Load alert history
    loadAlertHistory();

    // Update alerts display
    updateAlertsDisplay();
}

function loadAlertSettings() {
    try {
        const savedSettings = localStorage.getItem('healthDashboard_alertSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            alertSettings = { ...alertSettings, ...settings };
        }

        const savedThresholds = localStorage.getItem('healthDashboard_thresholds');
        if (savedThresholds) {
            const thresholds = JSON.parse(savedThresholds);
            HEALTH_THRESHOLDS = { ...HEALTH_THRESHOLDS, ...thresholds };
        }
    } catch (error) {
        window.electronAPI.logError(
            `Error loading alert settings: ${error.message}`,
            'SystemHealthTab'
        );
    }
}

function saveAlertSettingsToStorage() {
    try {
        const settingsToSave = JSON.stringify(alertSettings);
        const thresholdsToSave = JSON.stringify(HEALTH_THRESHOLDS);

        localStorage.setItem('healthDashboard_alertSettings', settingsToSave);
        localStorage.setItem('healthDashboard_thresholds', thresholdsToSave);

        // Verify the save worked
        const savedSettings = localStorage.getItem('healthDashboard_alertSettings');
        const savedThresholds = localStorage.getItem('healthDashboard_thresholds');

        if (!savedSettings || !savedThresholds) {
            throw new Error('Failed to verify saved settings in localStorage');
        }
    } catch (error) {
        window.electronAPI.logError(
            `Error saving alert settings: ${error.message}`,
            'SystemHealthTab'
        );
        throw error; // Re-throw so calling function can handle it
    }
}

function loadAlertHistory() {
    try {
        const savedHistory = localStorage.getItem('healthDashboard_alertHistory');
        if (savedHistory) {
            alertHistory = JSON.parse(savedHistory);
        }
    } catch (error) {
        window.electronAPI.logError(
            `Error loading alert history: ${error.message}`,
            'SystemHealthTab'
        );
    }
}

function saveAlertHistory() {
    try {
        // Keep only last 1000 alerts to prevent storage bloat
        if (alertHistory.length > 1000) {
            alertHistory = alertHistory.slice(-1000);
        }
        localStorage.setItem('healthDashboard_alertHistory', JSON.stringify(alertHistory));
    } catch (error) {
        window.electronAPI.logError(
            `Error saving alert history: ${error.message}`,
            'SystemHealthTab'
        );
    }
}

function createAlert(id, severity, title, message, metric = null, value = null) {
    const timestamp = new Date();
    const alert = {
        id,
        severity,
        title,
        message,
        metric,
        value,
        timestamp,
        dismissed: false,
    };

    // Add to active alerts
    activeAlerts.set(id, alert);

    // Add to history
    alertHistory.unshift({ ...alert });
    saveAlertHistory();

    // Show notification if enabled
    if (alertSettings.enableDesktopNotifications && severity !== ALERT_SEVERITY.INFO) {
        showDesktopNotification(alert);
    }

    // Play sound if enabled
    if (alertSettings.enableSound && severity === ALERT_SEVERITY.CRITICAL) {
        playAlertSound();
    }

    // Auto-dismiss info alerts if enabled
    if (alertSettings.autoDismissInfo && severity === ALERT_SEVERITY.INFO) {
        setTimeout(() => dismissAlert(id), 30000);
    }

    // Update display
    updateAlertsDisplay();
}

function dismissAlert(id) {
    if (activeAlerts.has(id)) {
        activeAlerts.delete(id);
        updateAlertsDisplay();
    }
}

function clearAllAlerts() {
    activeAlerts.clear();
    updateAlertsDisplay();
}

function checkMetricThresholds(metric, value, unit = '') {
    const thresholds = HEALTH_THRESHOLDS[metric];
    if (!thresholds) return;

    const alertId = `${metric}_threshold`;
    const currentAlert = activeAlerts.get(alertId);

    let severity = null;
    let title = '';
    let message = '';

    if (value >= thresholds.critical) {
        severity = ALERT_SEVERITY.CRITICAL;
        title = `Critical ${metric.charAt(0).toUpperCase() + metric.slice(1)} Usage`;
        message = `${metric.charAt(0).toUpperCase() + metric.slice(1)} usage is critically high at ${value}${unit}`;
    } else if (value >= thresholds.warning) {
        severity = ALERT_SEVERITY.WARNING;
        title = `High ${metric.charAt(0).toUpperCase() + metric.slice(1)} Usage`;
        message = `${metric.charAt(0).toUpperCase() + metric.slice(1)} usage is high at ${value}${unit}`;
    }

    // If we have a new alert condition
    if (severity) {
        // Only create/update if severity changed or no current alert
        if (!currentAlert || currentAlert.severity !== severity) {
            createAlert(alertId, severity, title, message, metric, value);
        }
    } else {
        // Clear alert if metric is back to normal
        if (currentAlert) {
            dismissAlert(alertId);

            // Create info alert for recovery
            createAlert(
                `${metric}_recovery`,
                ALERT_SEVERITY.INFO,
                `${metric.charAt(0).toUpperCase() + metric.slice(1)} Normal`,
                `${metric.charAt(0).toUpperCase() + metric.slice(1)} usage returned to normal levels (${value}${unit})`,
                metric,
                value
            );
        }
    }
}

function updateAlertsDisplay() {
    const alertsContainer = document.getElementById('alerts-container');
    if (!alertsContainer) return;

    // Clear existing content
    alertsContainer.innerHTML = '';

    if (activeAlerts.size === 0) {
        // Show no alerts message
        alertsContainer.innerHTML = `
            <div class="no-alerts-message">
                <i class="fas fa-check-circle"></i>
                <span>No active alerts - System is running normally</span>
            </div>
        `;
        return;
    }

    // Sort alerts by severity and timestamp
    const sortedAlerts = Array.from(activeAlerts.values()).sort((a, b) => {
        const severityOrder = { critical: 3, warning: 2, info: 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;
        return new Date(b.timestamp) - new Date(a.timestamp);
    });

    // Create alert elements
    sortedAlerts.forEach(alert => {
        const alertElement = createAlertElement(alert);
        alertsContainer.appendChild(alertElement);
    });
}

function createAlertElement(alert) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert-item ${alert.severity}`;
    alertDiv.dataset.alertId = alert.id;

    const timeString = alert.timestamp.toLocaleTimeString();
    const dateString = alert.timestamp.toLocaleDateString();

    alertDiv.innerHTML = `
        <div class="alert-icon">
            <i class="${ALERT_ICONS[alert.severity]}"></i>
        </div>
        <div class="alert-content">
            <div class="alert-title">${alert.title}</div>
            <div class="alert-message">${alert.message}</div>
            <div class="alert-timestamp">${dateString} ${timeString}</div>
        </div>
        <button class="alert-dismiss" onclick="dismissAlert('${alert.id}')" title="Dismiss Alert">
            <i class="fas fa-times"></i>
        </button>
    `;

    return alertDiv;
}

async function showDesktopNotification(alert) {
    try {
        // Check if native notifications are enabled and available
        if (
            alertSettings.enableNativeNotifications &&
            window.electronAPI &&
            window.electronAPI.showNativeNotification
        ) {
            const urgency =
                alert.severity === ALERT_SEVERITY.CRITICAL
                    ? 'critical'
                    : alert.severity === ALERT_SEVERITY.WARNING
                      ? 'normal'
                      : 'low';

            // Determine if notification should be silent
            const silent = !alertSettings.enableSound || alert.severity === ALERT_SEVERITY.INFO;

            // Determine if notification should be persistent
            const persistent =
                alertSettings.persistentCriticalAlerts &&
                alert.severity === ALERT_SEVERITY.CRITICAL;

            const result = await window.electronAPI.showNativeNotification({
                title: `System Health: ${alert.title}`,
                body: alert.message,
                urgency: urgency,
                silent: silent,
                persistent: persistent,
            });

            if (result.success) {
                return;
            } else {
                window.electronAPI.logWarn(
                    `Failed to show native notification: ${result.error}`,
                    'SystemHealthTab'
                );
                // Fallback to browser notification
                showBrowserNotification(alert);
            }
        } else {
            // Use browser notification if native notifications are disabled or unavailable
            showBrowserNotification(alert);
        }
    } catch (error) {
        window.electronAPI.logError(
            `Error showing desktop notification: ${error.message}`,
            'SystemHealthTab'
        );
        // Fallback to browser notification
        showBrowserNotification(alert);
    }
}

// Fallback browser notification function
function showBrowserNotification(alert) {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
        new Notification(`System Health: ${alert.title}`, {
            body: alert.message,
            icon: '/assets/icon.png',
        });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification(`System Health: ${alert.title}`, {
                    body: alert.message,
                    icon: '/assets/icon.png',
                });
            }
        });
    }
}

function playAlertSound() {
    try {
        // Create a simple beep sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
        window.electronAPI.logWarn(
            `Could not play alert sound: ${error.message}`,
            'SystemHealthTab'
        );
    }
}

function openAlertSettings() {
    const modal = document.getElementById('alert-settings-modal');
    if (!modal) return;

    // Populate current settings
    document.getElementById('memory-warning').value = HEALTH_THRESHOLDS.memory.warning;
    document.getElementById('memory-critical').value = HEALTH_THRESHOLDS.memory.critical;
    document.getElementById('disk-warning').value = HEALTH_THRESHOLDS.disk.warning;
    document.getElementById('disk-critical').value = HEALTH_THRESHOLDS.disk.critical;

    document.getElementById('enable-sound-alerts').checked = alertSettings.enableSound;
    document.getElementById('enable-desktop-notifications').checked =
        alertSettings.enableDesktopNotifications;
    document.getElementById('auto-dismiss-info').checked = alertSettings.autoDismissInfo;
    document.getElementById('enable-native-notifications').checked =
        alertSettings.enableNativeNotifications;
    document.getElementById('persistent-critical-alerts').checked =
        alertSettings.persistentCriticalAlerts;
    document.getElementById('refresh-interval').value = alertSettings.refreshInterval || 15;

    modal.style.display = 'flex';
}

function openAlertHistory() {
    const modal = document.getElementById('alert-history-modal');
    if (!modal) return;

    updateAlertHistoryDisplay();
    modal.style.display = 'flex';
}

function updateAlertHistoryDisplay(severityFilter = 'all', timeFilter = '24h') {
    const container = document.getElementById('alert-history-container');
    if (!container) return;

    let filteredHistory = [...alertHistory];

    // Apply severity filter
    if (severityFilter !== 'all') {
        filteredHistory = filteredHistory.filter(alert => alert.severity === severityFilter);
    }

    // Apply time filter
    const now = new Date();
    const timeFilters = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        all: Infinity,
    };

    if (timeFilter !== 'all') {
        const cutoff = now.getTime() - timeFilters[timeFilter];
        filteredHistory = filteredHistory.filter(
            alert => new Date(alert.timestamp).getTime() > cutoff
        );
    }

    // Clear and populate
    container.innerHTML = '';

    if (filteredHistory.length === 0) {
        container.innerHTML = `
            <div class="no-history-message">
                <i class="fas fa-info-circle"></i>
                <span>No alert history matches the selected filters</span>
            </div>
        `;
        return;
    }

    filteredHistory.forEach(alert => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';

        const timeString = new Date(alert.timestamp).toLocaleString();

        historyItem.innerHTML = `
            <div class="alert-icon">
                <i class="${ALERT_ICONS[alert.severity]}"></i>
            </div>
            <div class="alert-content">
                <div class="alert-title">${alert.title}</div>
                <div class="alert-message">${alert.message}</div>
                <div class="alert-timestamp">${timeString}</div>
            </div>
        `;

        container.appendChild(historyItem);
    });
}

// Cleanup function
function cleanupHealthDashboard() {
    if (!isHealthDashboardActive) {
        return;
    }
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
}

function setupModalEventListeners() {
    // Alert Settings Modal
    const alertSettingsModal = document.getElementById('alert-settings-modal');
    const closeAlertSettings = document.getElementById('close-alert-settings');
    const saveAlertSettings = document.getElementById('save-alert-settings');
    const resetAlertSettings = document.getElementById('reset-alert-settings');

    if (closeAlertSettings) {
        closeAlertSettings.addEventListener('click', () => {
            alertSettingsModal.style.display = 'none';
        });
    }

    if (saveAlertSettings) {
        saveAlertSettings.addEventListener('click', () => {
            try {
                // Validate and save threshold settings
                const memoryWarning = parseInt(document.getElementById('memory-warning').value);
                const memoryCritical = parseInt(document.getElementById('memory-critical').value);
                const diskWarning = parseInt(document.getElementById('disk-warning').value);
                const diskCritical = parseInt(document.getElementById('disk-critical').value);

                // Validation
                if (memoryWarning >= memoryCritical) {
                    alert('Memory warning threshold must be less than critical threshold');
                    return;
                }
                if (diskWarning >= diskCritical) {
                    alert('Disk warning threshold must be less than critical threshold');
                    return;
                }

                // Apply validated settings
                HEALTH_THRESHOLDS.memory.warning = memoryWarning;
                HEALTH_THRESHOLDS.memory.critical = memoryCritical;
                HEALTH_THRESHOLDS.disk.warning = diskWarning;
                HEALTH_THRESHOLDS.disk.critical = diskCritical;

                // Save alert preferences
                alertSettings.enableSound = document.getElementById('enable-sound-alerts').checked;
                alertSettings.enableDesktopNotifications = document.getElementById(
                    'enable-desktop-notifications'
                ).checked;
                alertSettings.autoDismissInfo =
                    document.getElementById('auto-dismiss-info').checked;
                alertSettings.enableNativeNotifications = document.getElementById(
                    'enable-native-notifications'
                ).checked;
                alertSettings.persistentCriticalAlerts = document.getElementById(
                    'persistent-critical-alerts'
                ).checked;

                // Save refresh interval and restart monitoring if changed
                const newRefreshInterval = parseInt(
                    document.getElementById('refresh-interval').value
                );
                const intervalChanged = alertSettings.refreshInterval !== newRefreshInterval;
                alertSettings.refreshInterval = newRefreshInterval;

                // Persist settings
                saveAlertSettingsToStorage();

                // Restart monitoring with new interval if it changed
                if (intervalChanged && isHealthDashboardActive) {
                    // Clear existing interval
                    if (healthUpdateInterval) {
                        clearInterval(healthUpdateInterval);
                        healthUpdateInterval = null;
                    }

                    // Start with new interval
                    const refreshIntervalMs = newRefreshInterval * 1000;
                    healthUpdateInterval = setInterval(updateHealthMetrics, refreshIntervalMs);

                    // Restart performance monitoring to apply new throttling
                    if (window.electronAPI) {
                        window.electronAPI.stopPerformanceUpdates();
                        window.electronAPI.startPerformanceUpdates();

                        // Set up new throttled performance updates
                        let lastPerformanceUpdate = 0;
                        const performanceThrottleMs = newRefreshInterval * 1000;

                        window.electronAPI.onPerformanceUpdate(metrics => {
                            const now = Date.now();
                            if (now - lastPerformanceUpdate >= performanceThrottleMs) {
                                updateRealTimeMetrics(metrics);
                                lastPerformanceUpdate = now;
                            }
                        });
                    }
                }

                alertSettingsModal.style.display = 'none';

                // Show confirmation
                createAlert(
                    'settings_saved',
                    ALERT_SEVERITY.INFO,
                    'Settings Saved',
                    'Alert settings have been updated successfully'
                );
            } catch (error) {
                alert('Error saving settings: ' + error.message);
            }
        });
    }

    if (resetAlertSettings) {
        resetAlertSettings.addEventListener('click', () => {
            // Reset to defaults
            HEALTH_THRESHOLDS.memory = { warning: 80, critical: 95 };
            HEALTH_THRESHOLDS.disk = { warning: 85, critical: 95 };

            alertSettings.enableSound = true;
            alertSettings.enableDesktopNotifications = true;
            alertSettings.autoDismissInfo = true;
            alertSettings.enableNativeNotifications = true;
            alertSettings.persistentCriticalAlerts = true;
            alertSettings.refreshInterval = 15;

            // Update UI
            document.getElementById('memory-warning').value = 80;
            document.getElementById('memory-critical').value = 95;
            document.getElementById('disk-warning').value = 85;
            document.getElementById('disk-critical').value = 95;

            document.getElementById('enable-sound-alerts').checked = true;
            document.getElementById('enable-desktop-notifications').checked = true;
            document.getElementById('auto-dismiss-info').checked = true;
            document.getElementById('enable-native-notifications').checked = true;
            document.getElementById('persistent-critical-alerts').checked = true;
            document.getElementById('refresh-interval').value = 15;
        });
    }

    // Alert History Modal
    const alertHistoryModal = document.getElementById('alert-history-modal');
    const closeAlertHistory = document.getElementById('close-alert-history');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const historySeverityFilter = document.getElementById('history-severity-filter');
    const historyTimeFilter = document.getElementById('history-time-filter');

    if (closeAlertHistory) {
        closeAlertHistory.addEventListener('click', () => {
            alertHistoryModal.style.display = 'none';
        });
    }

    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all alert history?')) {
                alertHistory = [];
                saveAlertHistory();
                updateAlertHistoryDisplay();
            }
        });
    }

    if (historySeverityFilter) {
        historySeverityFilter.addEventListener('change', e => {
            const timeFilter = historyTimeFilter ? historyTimeFilter.value : '24h';
            updateAlertHistoryDisplay(e.target.value, timeFilter);
        });
    }

    if (historyTimeFilter) {
        historyTimeFilter.addEventListener('change', e => {
            const severityFilter = historySeverityFilter ? historySeverityFilter.value : 'all';
            updateAlertHistoryDisplay(severityFilter, e.target.value);
        });
    }

    // Close modals when clicking outside
    [alertSettingsModal, alertHistoryModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', e => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }
    });
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
    window.tabEventManager.addEventListener('tabChanged', event => {
        const { tabId } = event.detail;
        if (tabId === 'system-health') {
            // Tab became active, start monitoring if not already started
            if (!isHealthDashboardActive) {
                // Ensure settings are loaded before starting
                loadAlertSettings();
                startHealthUpdates();
            }
        } else if (isHealthDashboardActive) {
            // Tab became inactive and we're currently active, stop monitoring to prevent CPU spikes
            cleanupHealthDashboard();
        }
    });
}

// Auto-initialize when the script loads
function initializeSystemHealth() {
    const container = document.querySelector('.folder-tab-container[data-tab="system-health"]');
    if (container) {
        loadSystemHealth(container);
    } else {
        setTimeout(initializeSystemHealth, 500);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initializeSystemHealth, 100);
});

// Also try to initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
    // DOM still loading, waiting for DOMContentLoaded
} else {
    setTimeout(initializeSystemHealth, 100);
}

// Clean up when page unloads to prevent memory leaks
window.addEventListener('beforeunload', cleanupHealthDashboard);

// Clean up when page becomes hidden (e.g., minimized)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        cleanupHealthDashboard();
    }
});


