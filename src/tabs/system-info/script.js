// System Info Tab JavaScript - Final Clean Version
console.log('=== System Info tab JavaScript loaded! ===');

// Initialize lazy loading helper
const lazyHelper = new LazyLoadingHelper('system-info');

// Simple initialization
console.log('Looking for tab container...');

// Check if should initialize (lazy loading support)
if (!lazyHelper.shouldInitialize()) {
    console.log('System Info script already executed, skipping initialization');
    lazyHelper.markTabReady();
} else {
    // Mark script as executed
    lazyHelper.markScriptExecuted();

    // Find the container
    let container = null;
    if (typeof tabContainer !== 'undefined') {
        container = tabContainer;
        console.log('Using provided tabContainer');
    }
    if (!container) {
        container = document.querySelector('[data-tab="system-info"]');
        console.log('Found container via data-tab selector');
    }

    if (container) {
        console.log('Setting up System Info tab with container:', container);
        setupRefreshButton(container);
        setupExportButton(container);
        loadSystemInfo(container);
    } else {
        console.error('No container found for system info tab, cannot load data.');
        // Still mark as ready to prevent blocking
        lazyHelper.markTabReady();
    }
}

function setupRefreshButton(container) {
    console.log('Setting up refresh button...');
    const refreshBtn = container.querySelector('#refresh-system-info-btn');
    if (refreshBtn) {
        console.log('Refresh button found, adding click listener');
        refreshBtn.addEventListener('click', () => {
            console.log('Refresh button clicked!');
            loadSystemInfo(container);
        });
    } else {
        console.warn('Refresh button not found in container');
        // Try global search as fallback
        const globalRefreshBtn = document.querySelector('#refresh-system-info-btn');
        if (globalRefreshBtn) {
            console.log('Found refresh button globally, adding click listener');
            globalRefreshBtn.addEventListener('click', () => {
                console.log('Global refresh button clicked!');
                loadSystemInfo(container);
            });
        }
    }
}

function setupExportButton(container) {
    console.log('Setting up export button...');
    const exportBtn = container.querySelector('#export-system-info-summary-btn');
    if (exportBtn) {
        console.log('Export button found, adding click listener');
        exportBtn.addEventListener('click', async () => {
            console.log('Export button clicked!');
            if (window && window.electronAPI) {
                try {
                    // Get comprehensive system information
                    const sysInfo = await window.electronAPI.getSystemInfo();

                    // Create export data that matches exactly what we display in the UI
                    const exportData = {
                        exportInfo: {
                            title: "WinTool System Information Export",
                            exportDate: new Date().toISOString(),
                            exportTime: new Date().toLocaleString(),
                            version: "2.4"
                        },

                        // Kernel Information (as displayed in Kernel card)
                        kernel: {
                            buildNumber: sysInfo.kernelBuild || 'Unknown',
                            version: sysInfo.kernelVersion || 'Unknown',
                            architecture: sysInfo.kernelArch || 'Unknown'
                        },

                        // Operating System Information (as displayed in OS card)
                        operatingSystem: {
                            edition: sysInfo.osEdition || 'Unknown',
                            installDate: sysInfo.osInstallDate || 'Unknown',
                            currentUser: sysInfo.osCurrentUser || 'Unknown',
                            computerName: sysInfo.osComputerName || 'Unknown'
                        },

                        // Motherboard Information (as displayed in Motherboard card)
                        motherboard: {
                            manufacturer: sysInfo.motherboardManufacturer || 'Unknown',
                            model: sysInfo.motherboardModel || 'Unknown',
                            version: sysInfo.motherboardVersion || 'Unknown',
                            serial: sysInfo.motherboardSerial || 'Unknown'
                        },

                        // BIOS Information (as displayed in BIOS card)
                        bios: {
                            vendor: sysInfo.biosVendor || 'Unknown',
                            version: sysInfo.biosVersion || 'Unknown',
                            releaseDate: sysInfo.biosReleaseDate || 'Unknown'
                        },

                        // CPU Information (as displayed in CPU card)
                        cpu: {
                            brand: sysInfo.cpuBrand || 'Unknown',
                            manufacturer: sysInfo.cpuManufacturer || 'Unknown',
                            family: sysInfo.cpuFamily || 'Unknown',
                            model: sysInfo.cpuModel || 'Unknown',
                            speed: sysInfo.cpuSpeed || 'Unknown',
                            cores: sysInfo.cpuCores || 'Unknown',
                            physicalCores: sysInfo.cpuPhysicalCores || 'Unknown',
                            processors: sysInfo.cpuProcessors || 'Unknown',
                            socket: sysInfo.cpuSocket || 'Unknown',
                            cache: {
                                l1d: sysInfo.cpuCacheL1d || 'Unknown',
                                l1i: sysInfo.cpuCacheL1i || 'Unknown',
                                l2: sysInfo.cpuCacheL2 || 'Unknown',
                                l3: sysInfo.cpuCacheL3 || 'Unknown'
                            }
                        },

                        // Storage Information (as displayed in Storage card)
                        storage: {
                            primaryDrive: sysInfo.storagePrimary || 'Unknown',
                            totalSpace: sysInfo.storageTotal || 'Unknown',
                            freeSpace: sysInfo.storageFree || 'Unknown',
                            usedSpace: sysInfo.storageUsed || 'Unknown'
                        },

                        // Graphics Information (as displayed in Graphics card - NO Video Memory)
                        graphics: {
                            primaryGpu: sysInfo.graphicsPrimaryGpu || 'Unknown',
                            vendor: sysInfo.graphicsVendor || 'Unknown',
                            driverVersion: sysInfo.graphicsDriverVersion || 'Unknown',
                            resolution: sysInfo.graphicsResolution || 'Unknown'
                        }
                    };

                    // Use the Electron save dialog for better UX
                    if (window.electronAPI.saveFile) {
                        const result = await window.electronAPI.saveFile(
                            JSON.stringify(exportData, null, 2),
                            {
                                title: 'Export System Information',
                                defaultPath: `system-info-${new Date().toISOString().split('T')[0]}.json`,
                                filters: [
                                    { name: 'JSON Files', extensions: ['json'] },
                                    { name: 'All Files', extensions: ['*'] }
                                ]
                            }
                        );

                        if (result && result.filePath) {
                            console.log('System information exported successfully to:', result.filePath);
                            // Show success notification if available
                            if (window.showNotification) {
                                window.showNotification('System information exported successfully!', 'success');
                            }
                        }
                    } else {
                        // Fallback to browser download
                        const data = JSON.stringify(exportData, null, 2);
                        const blob = new Blob([data], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `system-info-${new Date().toISOString().split('T')[0]}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        console.log('System information downloaded successfully');
                    }
                } catch (error) {
                    console.error('Error exporting system information:', error);
                    if (window.showNotification) {
                        window.showNotification('Failed to export system information', 'error');
                    }
                }
            } else {
                console.error('electronAPI is not available to export data.');
                if (window.showNotification) {
                    window.showNotification('Export functionality not available', 'error');
                }
            }
        });
    } else {
        console.warn('Export button not found in container');
        // Try global search as fallback
        const globalExportBtn = document.querySelector('#export-system-info-summary-btn');
        if (globalExportBtn) {
            console.log('Found export button globally, adding click listener');
            globalExportBtn.addEventListener('click', async () => {
                console.log('Global export button clicked!');
                // Same export functionality as above
                if (window && window.electronAPI) {
                    try {
                        const sysInfo = await window.electronAPI.getSystemInfo();
                        const exportData = {
                            exportInfo: {
                                title: "WinTool System Information Export",
                                exportDate: new Date().toISOString(),
                                exportTime: new Date().toLocaleString(),
                                version: "2.4"
                            },
                            kernel: {
                                buildNumber: sysInfo.kernelBuild || 'Unknown',
                                version: sysInfo.kernelVersion || 'Unknown',
                                architecture: sysInfo.kernelArch || 'Unknown'
                            },
                            operatingSystem: {
                                edition: sysInfo.osEdition || 'Unknown',
                                installDate: sysInfo.osInstallDate || 'Unknown',
                                currentUser: sysInfo.osCurrentUser || 'Unknown',
                                computerName: sysInfo.osComputerName || 'Unknown'
                            },
                            motherboard: {
                                manufacturer: sysInfo.motherboardManufacturer || 'Unknown',
                                model: sysInfo.motherboardModel || 'Unknown',
                                version: sysInfo.motherboardVersion || 'Unknown',
                                serial: sysInfo.motherboardSerial || 'Unknown'
                            },
                            bios: {
                                vendor: sysInfo.biosVendor || 'Unknown',
                                version: sysInfo.biosVersion || 'Unknown',
                                releaseDate: sysInfo.biosReleaseDate || 'Unknown'
                            },
                            cpu: {
                                brand: sysInfo.cpuBrand || 'Unknown',
                                manufacturer: sysInfo.cpuManufacturer || 'Unknown',
                                speed: sysInfo.cpuSpeed || 'Unknown',
                                cores: sysInfo.cpuCores || 'Unknown',
                                physicalCores: sysInfo.cpuPhysicalCores || 'Unknown',
                                processors: sysInfo.cpuProcessors || 'Unknown',
                                socket: sysInfo.cpuSocket || 'Unknown'
                            },
                            storage: {
                                primaryDrive: sysInfo.storagePrimary || 'Unknown',
                                totalSpace: sysInfo.storageTotal || 'Unknown',
                                freeSpace: sysInfo.storageFree || 'Unknown',
                                usedSpace: sysInfo.storageUsed || 'Unknown'
                            },
                            graphics: {
                                primaryGpu: sysInfo.graphicsPrimaryGpu || 'Unknown',
                                vendor: sysInfo.graphicsVendor || 'Unknown',
                                driverVersion: sysInfo.graphicsDriverVersion || 'Unknown',
                                resolution: sysInfo.graphicsResolution || 'Unknown'
                            }
                        };

                        if (window.electronAPI.saveFile) {
                            const result = await window.electronAPI.saveFile(
                                JSON.stringify(exportData, null, 2),
                                {
                                    title: 'Export System Information',
                                    defaultPath: `system-info-${new Date().toISOString().split('T')[0]}.json`,
                                    filters: [
                                        { name: 'JSON Files', extensions: ['json'] },
                                        { name: 'All Files', extensions: ['*'] }
                                    ]
                                }
                            );
                            if (result && result.filePath && window.showNotification) {
                                window.showNotification('System information exported successfully!', 'success');
                            }
                        }
                    } catch (error) {
                        console.error('Error exporting system information:', error);
                        if (window.showNotification) {
                            window.showNotification('Failed to export system information', 'error');
                        }
                    }
                }
            });
        }
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
            

            
            // Update Kernel information
            updateElement(container, 'kernel-build', sysInfo.kernelBuild || 'Unknown');
            updateElement(container, 'kernel-version', sysInfo.kernelVersion || 'Unknown');
            updateElement(container, 'kernel-arch', sysInfo.kernelArch || 'Unknown');

            // Update Operating System information
            updateElement(container, 'os-edition', sysInfo.osEdition || 'Unknown');
            updateElement(container, 'os-install-date', sysInfo.osInstallDate || 'Unknown');
            updateElement(container, 'os-current-user', sysInfo.osCurrentUser || 'Unknown');
            updateElement(container, 'os-computer-name', sysInfo.osComputerName || 'Unknown');
            
            // Update motherboard information
            updateElement(container, 'motherboard-manufacturer', sysInfo.motherboardManufacturer || 'Unknown');
            updateElement(container, 'motherboard-model', sysInfo.motherboardModel || 'Unknown');
            updateElement(container, 'motherboard-version', sysInfo.motherboardVersion || 'Unknown');
            updateElement(container, 'motherboard-serial', sysInfo.motherboardSerial || 'Unknown');
            
            // Update BIOS information
            updateElement(container, 'bios-vendor', sysInfo.biosVendor || 'Unknown');
            updateElement(container, 'bios-version', sysInfo.biosVersion || 'Unknown');
            updateElement(container, 'bios-release-date', sysInfo.biosReleaseDate || 'Unknown');



            // Update Storage information
            updateElement(container, 'storage-primary', sysInfo.storagePrimary || 'Unknown');
            updateElement(container, 'storage-total', sysInfo.storageTotal || 'Unknown');
            updateElement(container, 'storage-free', sysInfo.storageFree || 'Unknown');
            updateElement(container, 'storage-used', sysInfo.storageUsed || 'Unknown');

            // Update Graphics information
            updateElement(container, 'graphics-primary-gpu', sysInfo.graphicsPrimaryGpu || 'Unknown');
            updateElement(container, 'graphics-vendor', sysInfo.graphicsVendor || 'Unknown');
            updateElement(container, 'graphics-driver', sysInfo.graphicsDriverVersion || 'Unknown');
            updateElement(container, 'graphics-resolution', sysInfo.graphicsResolution || 'Unknown');

            console.log('System info updated successfully');

        } else {
            console.log('electronAPI not available, using fallback');
            updateElement(container, 'platform-info', 'Browser Mode');
            updateElement(container, 'arch-info', 'N/A');
            updateElement(container, 'hostname-info', 'localhost');
            updateElement(container, 'uptime-info', 'N/A');
        }

        // Signal that this tab is ready
        lazyHelper.markTabReady();

    } catch (error) {
        console.error('Error loading system info:', error);
        // Still signal ready even if there was an error
        lazyHelper.markTabReady();
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

// Create global reset function for refresh functionality
lazyHelper.createGlobalResetFunction();
