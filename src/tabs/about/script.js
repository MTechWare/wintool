// Add any interactive functionality for the About tab here.
// For example, dynamically loading the version number.

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Fetch app version (fallback if API not available)
        let version = '0.2.4w';
        if (window.electronAPI && window.electronAPI.getSetting) {
            try {
                version = await window.electronAPI.getSetting('appVersion', '0.2.4w');
            } catch (e) {
                console.log('Could not fetch app version, using default');
            }
        }
        const wintoolVersionEl = document.getElementById('wintool-version');
        if (wintoolVersionEl) {
            wintoolVersionEl.textContent = version;
        }

        // Fetch system info
        let systemInfo = {
            os: 'Unknown',
            cpu: 'Unknown', 
            memory: 'Unknown',
            diskSpace: 'Unknown'
        };
        
        if (window.electronAPI && window.electronAPI.getSystemInfo) {
            try {
                const sysInfo = await window.electronAPI.getSystemInfo();
                systemInfo = {
                    os: sysInfo.osDistro || sysInfo.platform || 'Unknown',
                    cpu: sysInfo.cpuBrand || 'Unknown',
                    memory: sysInfo.totalMemory || 'Unknown',
                    diskSpace: sysInfo.diskSpace || 'Unknown'
                };
            } catch (e) {
                console.log('Could not fetch system info, using defaults');
            }
        }
        
        const osEl = document.getElementById('sys-os');
        if (osEl) {
            osEl.textContent = systemInfo.os;
        }

        const cpuEl = document.getElementById('sys-cpu');
        if (cpuEl) {
            cpuEl.textContent = systemInfo.cpu;
        }

        const memEl = document.getElementById('sys-mem');
        if (memEl) {
            memEl.textContent = systemInfo.memory;
        }

        const diskEl = document.getElementById('sys-disk');
        if (diskEl) {
            diskEl.textContent = systemInfo.diskSpace;
        }

    } catch (error) {
        console.error('Failed to load about tab data:', error);
    }

    // Signal that this tab is ready
    if (window.markTabAsReady) {
        window.markTabAsReady('about');
    }
});