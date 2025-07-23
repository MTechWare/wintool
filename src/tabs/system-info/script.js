// System Info Tab JavaScript - Final Clean Version
console.log('=== System Info tab JavaScript loaded! ===');

// Simple initialization
console.log('Looking for tab container...');

// Find the container
let container = null;
if (typeof tabContainer !== 'undefined') {
    container = tabContainer;
    console.log('Using provided tabContainer');
}
if (!container) {
    container = document.querySelector('[data-tab="folder-system-info"]');
    console.log('Found container via data-tab selector');
}

if (container) {
    loadSystemInfo(container);
    setupRefreshButton(container);
    setupExportButton(container);
} else {
    console.error('No container found for system info tab, cannot load data.');
}

function setupRefreshButton(container) {
    const refreshBtn = container.querySelector('#refresh-system-info-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadSystemInfo(container);
        });
    }
}

function setupExportButton(container) {
    const exportBtn = container.querySelector('#export-system-info-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            if (window && window.electronAPI) {
                const sysInfo = await window.electronAPI.getSystemInfo();
                const data = JSON.stringify(sysInfo, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'system-info.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                console.error('electronAPI is not available to export data.');
            }
        });
    }
}

async function loadSystemInfo(container) {
    try {
        console.log('loadSystemInfo called with container:', container);
        
        // Get system info from Electron API
        if (window && window.electronAPI) {
            console.log('electronAPI available, calling getSystemInfo...');
            const sysInfo = await window.electronAPI.getSystemInfo();
            console.log('System info received:', sysInfo);
            
            // Update basic system overview
            updateElement(container, 'platform-info', sysInfo.platform || 'Unknown');
            updateElement(container, 'arch-info', sysInfo.arch || 'Unknown');
            updateElement(container, 'hostname-info', sysInfo.hostname || 'Unknown');
            updateElement(container, 'uptime-info', sysInfo.uptime || 'Unknown');
            
            // Update CPU information
            updateElement(container, 'cpu-brand', sysInfo.cpuBrand || 'Unknown');
            updateElement(container, 'cpu-manufacturer', sysInfo.cpuManufacturer || 'Unknown');
            updateElement(container, 'cpu-cores-info', `${sysInfo.cpuCores || 0} cores`);
            updateElement(container, 'cpu-speed-info', sysInfo.cpuSpeed || 'Unknown');
            updateElement(container, 'cpu-temperature-info', sysInfo.cpuTemperature || 'N/A');
            
            // Update detailed CPU information
            updateElement(container, 'cpu-speed', sysInfo.cpuSpeed || 'Unknown');
            updateElement(container, 'cpu-current-speed', sysInfo.cpuCurrentSpeed || 'Unknown');
            updateElement(container, 'cpu-speed-min', sysInfo.cpuSpeedMin || 'Unknown');
            updateElement(container, 'cpu-speed-max', sysInfo.cpuSpeedMax || 'Unknown');
            updateElement(container, 'cpu-cores', sysInfo.cpuCores || 'Unknown');
            updateElement(container, 'cpu-physical-cores', sysInfo.cpuPhysicalCores || 'Unknown');
            updateElement(container, 'cpu-processors', sysInfo.cpuProcessors || 'Unknown');
            updateElement(container, 'cpu-socket', sysInfo.cpuSocket || 'Unknown');
            
            // Update CPU cache information
            if (sysInfo.cpuCache) {
                updateElement(container, 'cpu-cache-l1d', sysInfo.cpuCache.l1d || 'N/A');
                updateElement(container, 'cpu-cache-l1i', sysInfo.cpuCache.l1i || 'N/A');
                updateElement(container, 'cpu-cache-l2', sysInfo.cpuCache.l2 || 'N/A');
                updateElement(container, 'cpu-cache-l3', sysInfo.cpuCache.l3 || 'N/A');
            }
            

            
            // Update hardware information
            updateElement(container, 'system-manufacturer', sysInfo.systemManufacturer || 'Unknown');
            updateElement(container, 'system-model', sysInfo.systemModel || 'Unknown');
            updateElement(container, 'system-version', sysInfo.systemVersion || 'Unknown');
            updateElement(container, 'system-serial', sysInfo.systemSerial || 'Unknown');
            updateElement(container, 'system-virtual', sysInfo.isVirtual ? 'Yes' : 'No');
            
            // Update motherboard information
            updateElement(container, 'motherboard-manufacturer', sysInfo.motherboardManufacturer || 'Unknown');
            updateElement(container, 'motherboard-model', sysInfo.motherboardModel || 'Unknown');
            updateElement(container, 'motherboard-version', sysInfo.motherboardVersion || 'Unknown');
            updateElement(container, 'motherboard-serial', sysInfo.motherboardSerial || 'Unknown');
            
            // Update BIOS information
            updateElement(container, 'bios-vendor', sysInfo.biosVendor || 'Unknown');
            updateElement(container, 'bios-version', sysInfo.biosVersion || 'Unknown');
            updateElement(container, 'bios-release-date', sysInfo.biosReleaseDate || 'Unknown');
            

            
            // Update operating system information
            updateElement(container, 'os-distro', sysInfo.osDistro || 'Unknown');
            updateElement(container, 'os-release', sysInfo.osRelease || 'Unknown');
            updateElement(container, 'os-codename', sysInfo.osCodename || 'Unknown');
            updateElement(container, 'os-kernel', sysInfo.osKernel || 'Unknown');
            updateElement(container, 'os-build', sysInfo.osBuild || 'Unknown');
            updateElement(container, 'os-serial', sysInfo.osSerial || 'Unknown');
            

            
            console.log('System info updated successfully');

        } else {
            console.log('electronAPI not available, using fallback');
            updateElement(container, 'platform-info', 'Browser Mode');
            updateElement(container, 'arch-info', 'N/A');
            updateElement(container, 'hostname-info', 'localhost');
            updateElement(container, 'uptime-info', 'N/A');
        }

        // Signal that this tab is ready
        if (window.markTabAsReady && typeof tabId !== 'undefined') {
            console.log('Marking system-info tab as ready');
            window.markTabAsReady(tabId);
        }

    } catch (error) {
        console.error('Error loading system info:', error);
        // Still signal ready even if there was an error
        if (window.markTabAsReady && typeof tabId !== 'undefined') {
            console.log('Marking system-info tab as ready (after error)');
            window.markTabAsReady(tabId);
        }
    }
}

// Simple helper function to update elements
function updateElement(container, id, value) {
    try {
        console.log('Looking for element with ID:', id, 'in container:', container);
        const element = container.querySelector('#' + id);
        if (element) {
            element.textContent = value;
            console.log('Updated', id, 'with value:', value);
        } else {
            console.warn('Element not found:', id);
            // Try to find it in the whole document as a fallback
            const globalElement = document.querySelector('#' + id);
            if (globalElement) {
                globalElement.textContent = value;
                console.log('Updated', id, 'globally with value:', value);
            } else {
                console.warn('Element not found globally either:', id);
            }
        }
    } catch (error) {
        console.error('Error updating element', id, ':', error);
    }
}
