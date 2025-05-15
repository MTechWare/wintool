/**
 * WinTool - Hardware Monitor Tab JavaScript
 * Handles functionality specific to the hardware monitor tab
 */

// Button element
let openHardwareMonitorBtn = null;

// Debug flag - set to true to enable verbose logging
const DEBUG = true;

// Format bytes to human readable size
function formatBytes(bytes, decimals = 1) {
    if (!bytes) return '0 GB';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

// Get temperature color based on value
function getTemperatureColor(temp) {
    if (temp < 50) return '#4ade80'; // Green
    if (temp < 70) return '#facc15'; // Yellow
    if (temp < 85) return '#f87171'; // Orange
    return '#ef4444'; // Red
}

// Update temperature gauge
function updateTemperatureGauge(gaugeEl, temp) {
    if (!gaugeEl || !temp || temp <= 0) {
        if (gaugeEl) gaugeEl.style.width = '0%';
        return;
    }

    // Calculate percentage (0-100°C range)
    // Most CPUs/GPUs operate between 30-90°C
    // Below 30°C will show as very low, above 100°C will max out the gauge
    let percentage = Math.min(Math.max((temp / 100) * 100, 0), 100);

    // Update gauge width
    gaugeEl.style.width = `${percentage}%`;
}

// Update hardware information
async function updateHardwareInfo() {
    try {
        console.log('Updating hardware info...');

        // Check if electronAPI is available
        if (!window.electronAPI) {
            console.error('electronAPI is not available in updateHardwareInfo!');
            throw new Error('electronAPI is not available');
        }

        // Get hardware info (both CPU and GPU)
        let hardwareInfo;

        try {
            console.log('Calling getHardwareInfo API...');
            hardwareInfo = await window.electronAPI.getHardwareInfo();
            console.log('Hardware info received:', JSON.stringify(hardwareInfo, null, 2));

            // Extract CPU and GPU info
            const cpuInfo = hardwareInfo.cpu;
            const gpuInfo = hardwareInfo.gpu;

            console.log('CPU info extracted:', JSON.stringify(cpuInfo, null, 2));
            console.log('GPU info extracted:', JSON.stringify(gpuInfo, null, 2));

            // Update UI with CPU info
            if (cpuInfo) {
                if (cpuModelEl) cpuModelEl.innerText = cpuInfo.model || cpuInfo.name || 'Not available';
                if (cpuCoresEl) cpuCoresEl.innerText = cpuInfo.cores || 'Not available';
                if (cpuThreadsEl) cpuThreadsEl.innerText = cpuInfo.threads || 'Not available';

                const speedValue = cpuInfo.speed || cpuInfo.clock || 'Not available';
                if (cpuSpeedEl) cpuSpeedEl.innerText = typeof speedValue === 'number' ? `${speedValue} MHz` : speedValue;

                if (cpuTempValueEl) {
                    if (cpuInfo.temperature) {
                        const cpuTemp = Math.round(cpuInfo.temperature);
                        cpuTempValueEl.innerText = cpuTemp;

                        // Update temperature gauge
                        if (cpuTempGaugeEl) {
                            updateTemperatureGauge(cpuTempGaugeEl, cpuTemp);
                        }
                    } else {
                        cpuTempValueEl.innerText = '--';
                        if (cpuTempGaugeEl) {
                            cpuTempGaugeEl.style.width = '0%';
                        }
                    }
                }

                if (cpuUsageValueEl) {
                    const cpuUsage = cpuInfo.usage !== null && cpuInfo.usage !== undefined ? cpuInfo.usage :
                                    cpuInfo.load !== null && cpuInfo.load !== undefined ? cpuInfo.load : null;

                    if (cpuUsage !== null) {
                        cpuUsageValueEl.innerText = `${Math.round(cpuUsage)}%`;
                    } else {
                        cpuUsageValueEl.innerText = '--%';
                    }
                }
            }

            // Update UI with GPU info
            if (gpuInfo) {
                if (gpuModelEl) gpuModelEl.innerText = gpuInfo.model || gpuInfo.name || 'Not available';
                if (gpuVendorEl) gpuVendorEl.innerText = gpuInfo.vendor || 'Not available';

                if (gpuMemoryEl) {
                    if (gpuInfo.memory) {
                        if (typeof gpuInfo.memory === 'object' && gpuInfo.memory.total) {
                            gpuMemoryEl.innerText = formatBytes(gpuInfo.memory.total * 1024 * 1024);
                        } else if (typeof gpuInfo.memory === 'number') {
                            gpuMemoryEl.innerText = formatBytes(gpuInfo.memory * 1024 * 1024);
                        } else {
                            gpuMemoryEl.innerText = 'Not available';
                        }
                    } else {
                        gpuMemoryEl.innerText = 'Not available';
                    }
                }

                if (gpuDriverEl) gpuDriverEl.innerText = gpuInfo.driver || 'Not available';

                if (gpuTempValueEl) {
                    if (gpuInfo.temperature) {
                        const gpuTemp = Math.round(gpuInfo.temperature);
                        gpuTempValueEl.innerText = gpuTemp;

                        // Update temperature gauge
                        if (gpuTempGaugeEl) {
                            updateTemperatureGauge(gpuTempGaugeEl, gpuTemp);
                        }
                    } else {
                        gpuTempValueEl.innerText = '--';
                        if (gpuTempGaugeEl) {
                            gpuTempGaugeEl.style.width = '0%';
                        }
                    }
                }

                if (gpuUsageValueEl) {
                    const gpuUsage = gpuInfo.usage !== null && gpuInfo.usage !== undefined ? gpuInfo.usage :
                                    gpuInfo.load !== null && gpuInfo.load !== undefined ? gpuInfo.load : null;

                    if (gpuUsage !== null) {
                        gpuUsageValueEl.innerText = `${Math.round(gpuUsage)}%`;
                    } else {
                        gpuUsageValueEl.innerText = '--%';
                    }
                }
            }

            // Mark as loaded
            hardwareDataLoaded = true;

            // Update last update timestamp
            if (lastUpdateEl) {
                const date = new Date();
                const timeString = date.toLocaleTimeString();
                lastUpdateEl.innerText = timeString;
            }

            return;
        } catch (hardwareError) {
            console.error('Error getting hardware info:', hardwareError);
            // Continue with individual API calls as fallback
        }

        // Fallback to individual API calls
        let cpuInfo, gpuInfo;

        try {
            if (DEBUG) console.log('Calling getCpuInfo API as fallback...');
            cpuInfo = await window.electronAPI.getCpuInfo();
            if (DEBUG) console.log('CPU info received:', JSON.stringify(cpuInfo, null, 2));

            // Update UI with CPU info
            if (cpuInfo) {
                if (cpuModelEl) cpuModelEl.innerText = cpuInfo.model || cpuInfo.name || 'Not available';
                if (cpuCoresEl) cpuCoresEl.innerText = cpuInfo.cores || 'Not available';
                if (cpuThreadsEl) cpuThreadsEl.innerText = cpuInfo.threads || 'Not available';

                const speedValue = cpuInfo.speed || cpuInfo.clock || 'Not available';
                if (cpuSpeedEl) cpuSpeedEl.innerText = typeof speedValue === 'number' ? `${speedValue} MHz` : speedValue;

                if (cpuTempValueEl) {
                    if (cpuInfo.temperature) {
                        const cpuTemp = Math.round(cpuInfo.temperature);
                        cpuTempValueEl.innerText = cpuTemp;

                        // Update temperature gauge
                        if (cpuTempGaugeEl) {
                            updateTemperatureGauge(cpuTempGaugeEl, cpuTemp);
                        }
                    } else {
                        cpuTempValueEl.innerText = '--';
                        if (cpuTempGaugeEl) {
                            cpuTempGaugeEl.style.width = '0%';
                        }
                    }
                }

                if (cpuUsageValueEl) {
                    const cpuUsage = cpuInfo.usage !== null && cpuInfo.usage !== undefined ? cpuInfo.usage :
                                    cpuInfo.load !== null && cpuInfo.load !== undefined ? cpuInfo.load : null;

                    if (cpuUsage !== null) {
                        cpuUsageValueEl.innerText = `${Math.round(cpuUsage)}%`;
                    } else {
                        cpuUsageValueEl.innerText = '--%';
                    }
                }
            }
        } catch (cpuError) {
            console.error('Error getting CPU info:', cpuError);
        }

        try {
            if (DEBUG) console.log('Calling getGpuInfo API as fallback...');
            gpuInfo = await window.electronAPI.getGpuInfo();
            if (DEBUG) console.log('GPU info received:', JSON.stringify(gpuInfo, null, 2));

            // Update UI with GPU info
            if (gpuInfo) {
                if (gpuModelEl) gpuModelEl.innerText = gpuInfo.model || gpuInfo.name || 'Not available';
                if (gpuVendorEl) gpuVendorEl.innerText = gpuInfo.vendor || 'Not available';

                if (gpuMemoryEl) {
                    if (gpuInfo.memory) {
                        if (typeof gpuInfo.memory === 'object' && gpuInfo.memory.total) {
                            gpuMemoryEl.innerText = formatBytes(gpuInfo.memory.total * 1024 * 1024);
                        } else if (typeof gpuInfo.memory === 'number') {
                            gpuMemoryEl.innerText = formatBytes(gpuInfo.memory * 1024 * 1024);
                        } else {
                            gpuMemoryEl.innerText = 'Not available';
                        }
                    } else {
                        gpuMemoryEl.innerText = 'Not available';
                    }
                }

                if (gpuDriverEl) gpuDriverEl.innerText = gpuInfo.driver || 'Not available';

                if (gpuTempValueEl) {
                    if (gpuInfo.temperature) {
                        const gpuTemp = Math.round(gpuInfo.temperature);
                        gpuTempValueEl.innerText = gpuTemp;

                        // Update temperature gauge
                        if (gpuTempGaugeEl) {
                            updateTemperatureGauge(gpuTempGaugeEl, gpuTemp);
                        }
                    } else {
                        gpuTempValueEl.innerText = '--';
                        if (gpuTempGaugeEl) {
                            gpuTempGaugeEl.style.width = '0%';
                        }
                    }
                }

                if (gpuUsageValueEl) {
                    const gpuUsage = gpuInfo.usage !== null && gpuInfo.usage !== undefined ? gpuInfo.usage :
                                    gpuInfo.load !== null && gpuInfo.load !== undefined ? gpuInfo.load : null;

                    if (gpuUsage !== null) {
                        gpuUsageValueEl.innerText = `${Math.round(gpuUsage)}%`;
                    } else {
                        gpuUsageValueEl.innerText = '--%';
                    }
                }
            }

            // Mark as loaded if we have either CPU or GPU info
            if (cpuInfo || gpuInfo) {
                hardwareDataLoaded = true;

                // Update last update timestamp
                if (lastUpdateEl) {
                    const date = new Date();
                    const timeString = date.toLocaleTimeString();
                    lastUpdateEl.innerText = timeString;
                }
            }
        } catch (error) {
            console.error("Error updating hardware info:", error);
        }
    }
}

// Update just the temperature data (more efficient)
async function updateTemperatureOnly() {
    try {
        if (DEBUG) console.log('Updating temperature data only...');

        // Get temperature data using the optimized function
        const tempData = await window.electronAPI.getTemperatureData();
        if (DEBUG) console.log('Temperature data received:', tempData);

        // Update CPU temperature
        if (cpuTempValueEl && tempData.cpu) {
            const cpuTemp = Math.round(tempData.cpu);
            cpuTempValueEl.innerText = cpuTemp;

            // Update temperature gauge
            if (cpuTempGaugeEl) {
                updateTemperatureGauge(cpuTempGaugeEl, cpuTemp);
            }
        }

        // Update GPU temperature
        if (gpuTempValueEl && tempData.gpu) {
            const gpuTemp = Math.round(tempData.gpu);
            gpuTempValueEl.innerText = gpuTemp;

            // Update temperature gauge
            if (gpuTempGaugeEl) {
                updateTemperatureGauge(gpuTempGaugeEl, gpuTemp);
            }
        }

        // Update last update timestamp
        if (lastUpdateEl) {
            const date = new Date();
            const timeString = date.toLocaleTimeString();
            lastUpdateEl.innerText = timeString;
        }
    } catch (error) {
        console.error('Error updating temperature data:', error);
    }
}

// Set up event listeners
function setupEventListeners() {
    // Refresh button
    refreshBtn = document.getElementById('refresh-hardware');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Refreshing...';

            try {
                await updateHardwareInfo();

                // Update timestamp immediately after refresh
                if (lastUpdateEl) {
                    const date = new Date();
                    const timeString = date.toLocaleTimeString();
                    lastUpdateEl.innerText = timeString;
                    if (DEBUG) console.log('Refresh timestamp updated:', timeString);
                }
            } catch (error) {
                console.error('Error refreshing hardware info:', error);
            }

            setTimeout(() => {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Hardware Info';
            }, 1000);
        });
    }

    // Auto refresh toggle
    autoRefreshToggle = document.getElementById('auto-refresh-toggle');
    if (autoRefreshToggle) {
        autoRefreshToggle.addEventListener('change', () => {
            if (autoRefreshToggle.checked) {
                startAutoRefresh();
            } else {
                stopAutoRefresh();
            }
        });
    }

    // Refresh interval select
    refreshIntervalSelect = document.getElementById('refresh-interval');
    if (refreshIntervalSelect) {
        refreshIntervalSelect.addEventListener('change', () => {
            refreshIntervalMs = parseInt(refreshIntervalSelect.value);

            // Restart auto refresh with new interval if enabled
            if (autoRefreshToggle && autoRefreshToggle.checked) {
                stopAutoRefresh();
                startAutoRefresh();
            }
        });
    }
}

// Start auto refresh
function startAutoRefresh() {
    stopAutoRefresh(); // Clear any existing interval

    // Update immediately first
    updateHardwareInfo().catch(error => {
        console.error('Error in immediate hardware update:', error);
    });

    // Set up two intervals:
    // 1. Fast interval for temperature updates only
    const tempUpdateInterval = Math.min(refreshIntervalMs, 10000); // Use at most 10 seconds for temp updates (increased from 2s)

    // Temperature update interval (faster)
    const tempInterval = setInterval(async () => {
        try {
            // Only update if the tab is visible to save resources
            if (document.visibilityState === 'visible' && document.getElementById('tab-hardware').classList.contains('active')) {
                await updateTemperatureOnly();
                if (DEBUG) console.log('Temperature update completed');
            } else {
                if (DEBUG) console.log('Skipping temperature update - tab not visible');
            }
        } catch (error) {
            console.error('Error in temperature update:', error);
        }
    }, tempUpdateInterval);

    // Full hardware info update interval (slower)
    const fullInterval = setInterval(async () => {
        try {
            // Only update if the tab is visible to save resources
            if (document.visibilityState === 'visible' && document.getElementById('tab-hardware').classList.contains('active')) {
                await updateHardwareInfo();
                if (DEBUG) console.log('Full hardware update completed');
            } else {
                if (DEBUG) console.log('Skipping full hardware update - tab not visible');
            }
        } catch (error) {
            console.error('Error in full hardware update:', error);
        }
    }, refreshIntervalMs);

    // Store both intervals
    updateInterval = [fullInterval, tempInterval];

    if (DEBUG) console.log(`Auto refresh started with intervals: ${refreshIntervalMs}ms (full) and ${tempUpdateInterval}ms (temp)`);
}

// Stop auto refresh
function stopAutoRefresh() {
    if (updateInterval) {
        // Check if updateInterval is an array (multiple intervals)
        if (Array.isArray(updateInterval)) {
            updateInterval.forEach(interval => {
                if (interval) clearInterval(interval);
            });
        } else {
            // Single interval
            clearInterval(updateInterval);
        }
        updateInterval = null;
        if (DEBUG) console.log('Auto refresh stopped');
    }
}

// Initialize the hardware tab
async function initHardwareTab() {
    console.log('Initializing hardware tab...');

    // Clear any existing intervals
    cleanupHardwareTab();

    try {
        console.log('Checking if electronAPI is available:', !!window.electronAPI);

        if (!window.electronAPI) {
            console.error('electronAPI is not available!');

            // Try to wait a bit and check again
            await new Promise(resolve => setTimeout(resolve, 1000));

            console.log('Checking again if electronAPI is available:', !!window.electronAPI);

            if (!window.electronAPI) {
                throw new Error('electronAPI is not available. Cannot initialize hardware tab.');
            }
        }

        // First, test the hardware monitor to make sure it's working
        try {
            console.log('Testing hardware monitor...');
            const testResult = await window.electronAPI.testHardwareMonitor();
            console.log('Hardware monitor test result:', testResult);
        } catch (testError) {
            console.error('Hardware monitor test failed:', testError);
        }

        // Initialize elements
        console.log('Initializing UI elements...');

        cpuModelEl = document.getElementById('hw-cpu-model');
        cpuCoresEl = document.getElementById('hw-cpu-cores');
        cpuThreadsEl = document.getElementById('hw-cpu-threads');
        cpuSpeedEl = document.getElementById('hw-cpu-speed');
        cpuTempValueEl = document.getElementById('hw-cpu-temp-value');
        cpuTempGaugeEl = document.getElementById('hw-cpu-temp-gauge');
        cpuUsageValueEl = document.getElementById('hw-cpu-usage-value');

        gpuModelEl = document.getElementById('hw-gpu-model');
        gpuVendorEl = document.getElementById('hw-gpu-vendor');
        gpuMemoryEl = document.getElementById('hw-gpu-memory');
        gpuDriverEl = document.getElementById('hw-gpu-driver');
        gpuTempValueEl = document.getElementById('hw-gpu-temp-value');
        gpuTempGaugeEl = document.getElementById('hw-gpu-temp-gauge');
        gpuUsageValueEl = document.getElementById('hw-gpu-usage-value');

        refreshBtn = document.getElementById('refresh-hardware');
        autoRefreshToggle = document.getElementById('auto-refresh-toggle');
        refreshIntervalSelect = document.getElementById('refresh-interval');
        lastUpdateEl = document.getElementById('hw-last-update');

        console.log('UI elements initialized:', {
            cpuModelEl: !!cpuModelEl,
            cpuCoresEl: !!cpuCoresEl,
            cpuThreadsEl: !!cpuThreadsEl,
            cpuSpeedEl: !!cpuSpeedEl,
            cpuTempValueEl: !!cpuTempValueEl,
            cpuTempGaugeEl: !!cpuTempGaugeEl,
            cpuUsageValueEl: !!cpuUsageValueEl,
            gpuModelEl: !!gpuModelEl,
            gpuVendorEl: !!gpuVendorEl,
            gpuMemoryEl: !!gpuMemoryEl,
            gpuDriverEl: !!gpuDriverEl,
            gpuTempValueEl: !!gpuTempValueEl,
            gpuTempGaugeEl: !!gpuTempGaugeEl,
            gpuUsageValueEl: !!gpuUsageValueEl,
            refreshBtn: !!refreshBtn,
            autoRefreshToggle: !!autoRefreshToggle,
            refreshIntervalSelect: !!refreshIntervalSelect,
            lastUpdateEl: !!lastUpdateEl
        });

        // Set up event listeners
        console.log('Setting up event listeners...');
        setupEventListeners();

        // Do initial update
        console.log('Performing initial hardware info update...');
        try {
            await updateHardwareInfo();
            console.log('Initial hardware info update completed');
        } catch (updateError) {
            console.error('Error in initial hardware update:', updateError);
        }

        // Make sure the timestamp is updated
        if (lastUpdateEl) {
            const date = new Date();
            const timeString = date.toLocaleTimeString();
            lastUpdateEl.innerText = timeString;
            console.log('Initial timestamp updated:', timeString);
        }

        // Initialize temperature gauges with default values
        if (cpuTempGaugeEl && cpuTempValueEl) {
            const cpuTemp = parseInt(cpuTempValueEl.innerText);
            if (!isNaN(cpuTemp) && cpuTemp > 0) {
                updateTemperatureGauge(cpuTempGaugeEl, cpuTemp);
                console.log('CPU temperature gauge initialized with:', cpuTemp);
            }
        }

        if (gpuTempGaugeEl && gpuTempValueEl) {
            const gpuTemp = parseInt(gpuTempValueEl.innerText);
            if (!isNaN(gpuTemp) && gpuTemp > 0) {
                updateTemperatureGauge(gpuTempGaugeEl, gpuTemp);
                console.log('GPU temperature gauge initialized with:', gpuTemp);
            }
        }

        // Start auto refresh if enabled
        if (autoRefreshToggle && autoRefreshToggle.checked) {
            console.log('Starting auto refresh...');
            startAutoRefresh();
        }

        // Set multiple timeouts to update again to ensure data is loaded
        // First update after 1 second
        setTimeout(async () => {
            try {
                console.log('Performing 1-second delayed hardware info update...');
                await updateHardwareInfo();
            } catch (error) {
                console.error('Error in 1-second delayed hardware update:', error);
            }
        }, 1000);

        // Second update after 3 seconds
        setTimeout(async () => {
            try {
                console.log('Performing 3-second delayed hardware info update...');
                await updateHardwareInfo();
            } catch (error) {
                console.error('Error in 3-second delayed hardware update:', error);
            }
        }, 3000);

        console.log('Hardware tab initialization completed successfully');

    } catch (error) {
        console.error('Failed to initialize hardware tab:', error);
    }
}

// Clean up when leaving the tab
function cleanupHardwareTab() {
    console.log('Cleaning up hardware tab...');

    // Stop auto refresh
    stopAutoRefresh();

    // Reset state
    hardwareDataLoaded = false;

    // Reset last update timestamp
    if (lastUpdateEl) {
        lastUpdateEl.innerText = 'Never';
    }
}

// Make functions globally available
window.initHardwareTab = initHardwareTab;
window.cleanupHardwareTab = cleanupHardwareTab;

// Initialize the hardware tab when the tab is clicked
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired in hardware.js');

    // Try to initialize the hardware tab immediately
    setTimeout(() => {
        console.log('Attempting to initialize hardware tab immediately');
        try {
            // Get the tab content element
            const tabContent = document.getElementById('tab-hardware');

            if (tabContent) {
                console.log('Hardware tab content element found, initializing...');

                // Initialize the hardware tab
                initHardwareTab();

                // Mark the tab as loaded
                tabContent.setAttribute('data-loaded', 'true');
            } else {
                console.error('Hardware tab content element not found');
            }
        } catch (error) {
            console.error('Error initializing hardware tab:', error);
        }
    }, 1000);

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
