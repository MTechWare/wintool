const lazyHelper = new LazyLoadingHelper('system-info');
if (!lazyHelper.shouldInitialize()) {
    lazyHelper.markTabReady();
} else {
    lazyHelper.markScriptExecuted();
    let container = null;
    if (typeof tabContainer !== 'undefined') {
        container = tabContainer;
    }
    if (!container) {
        container = document.querySelector('[data-tab="system-info"]');
    }

    if (container) {
        setupRefreshButton(container);
        setupExportButton(container);
        loadSystemInfo(container);
    } else {
        window.electronAPI.logError(
            'No container found for system info tab, cannot load data',
            'SystemInfoTab'
        );
        lazyHelper.markTabReady();
    }
}

function setupRefreshButton(container) {
    const refreshBtn = container.querySelector('#refresh-system-info-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadSystemInfo(container);
        });
    } else {
        window.electronAPI.logWarn('Refresh button not found in container', 'SystemInfoTab');
        // Try global search as fallback
        const globalRefreshBtn = document.querySelector('#refresh-system-info-btn');
        if (globalRefreshBtn) {
            globalRefreshBtn.addEventListener('click', () => {
                loadSystemInfo(container);
            });
        }
    }
}

function setupExportButton(container) {
    const exportBtn = container.querySelector('#export-system-info-summary-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            if (window && window.electronAPI) {
                try {
                    // Get comprehensive system information
                    const sysInfo = await window.electronAPI.getSystemInfo();

                    // Create export data that matches exactly what we display in the UI
                    const exportData = {
                        exportInfo: {
                            title: 'WinTool System Information Export',
                            exportDate: new Date().toISOString(),
                            exportTime: new Date().toLocaleString(),
                            version: '2.4',
                        },

                        // Kernel Information (as displayed in Kernel card)
                        kernel: {
                            buildNumber: sysInfo.kernelBuild || 'Unknown',
                            version: sysInfo.kernelVersion || 'Unknown',
                            architecture: sysInfo.kernelArch || 'Unknown',
                        },

                        // Operating System Information (as displayed in OS card)
                        operatingSystem: {
                            edition: sysInfo.osEdition || 'Unknown',
                            installDate: sysInfo.osInstallDate || 'Unknown',
                            currentUser: sysInfo.osCurrentUser || 'Unknown',
                            computerName: sysInfo.osComputerName || 'Unknown',
                        },

                        // Motherboard Information (as displayed in Motherboard card)
                        motherboard: {
                            manufacturer: sysInfo.motherboardManufacturer || 'Unknown',
                            model: sysInfo.motherboardModel || 'Unknown',
                            version: sysInfo.motherboardVersion || 'Unknown',
                            serial: sysInfo.motherboardSerial || 'Unknown',
                        },

                        // BIOS Information (as displayed in BIOS card)
                        bios: {
                            vendor: sysInfo.biosVendor || 'Unknown',
                            version: sysInfo.biosVersion || 'Unknown',
                            releaseDate: sysInfo.biosReleaseDate || 'Unknown',
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
                                l3: sysInfo.cpuCacheL3 || 'Unknown',
                            },
                        },

                        // Storage Information (as displayed in Storage card)
                        storage: {
                            primaryDrive: sysInfo.storagePrimary || 'Unknown',
                            totalSpace: sysInfo.storageTotal || 'Unknown',
                            freeSpace: sysInfo.storageFree || 'Unknown',
                            usedSpace: sysInfo.storageUsed || 'Unknown',
                        },

                        // Graphics Information (as displayed in Graphics card - NO Video Memory)
                        graphics: {
                            primaryGpu: sysInfo.graphicsPrimaryGpu || 'Unknown',
                            vendor: sysInfo.graphicsVendor || 'Unknown',
                            driverVersion: sysInfo.graphicsDriverVersion || 'Unknown',
                            resolution: sysInfo.graphicsResolution || 'Unknown',
                        },
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
                                    { name: 'All Files', extensions: ['*'] },
                                ],
                            }
                        );

                        if (result && result.filePath) {
                            // Show success notification if available
                            if (window.showNotification) {
                                window.showNotification(
                                    'System information exported successfully!',
                                    'success'
                                );
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
                    }
                } catch (error) {
                    window.electronAPI.logError(
                        `Error exporting system information: ${error.message}`,
                        'SystemInfoTab'
                    );
                    if (window.showNotification) {
                        window.showNotification('Failed to export system information', 'error');
                    }
                }
            } else {
                window.electronAPI.logError(
                    'electronAPI is not available to export data',
                    'SystemInfoTab'
                );
                if (window.showNotification) {
                    window.showNotification('Export functionality not available', 'error');
                }
            }
        });
    } else {
        window.electronAPI.logWarn('Export button not found in container', 'SystemInfoTab');
        // Try global search as fallback
        const globalExportBtn = document.querySelector('#export-system-info-summary-btn');
        if (globalExportBtn) {
            globalExportBtn.addEventListener('click', async () => {
                // Same export functionality as above
                if (window && window.electronAPI) {
                    try {
                        const sysInfo = await window.electronAPI.getSystemInfo();
                        const exportData = {
                            exportInfo: {
                                title: 'WinTool System Information Export',
                                exportDate: new Date().toISOString(),
                                exportTime: new Date().toLocaleString(),
                                version: '2.4',
                            },
                            kernel: {
                                buildNumber: sysInfo.kernelBuild || 'Unknown',
                                version: sysInfo.kernelVersion || 'Unknown',
                                architecture: sysInfo.kernelArch || 'Unknown',
                            },
                            operatingSystem: {
                                edition: sysInfo.osEdition || 'Unknown',
                                installDate: sysInfo.osInstallDate || 'Unknown',
                                currentUser: sysInfo.osCurrentUser || 'Unknown',
                                computerName: sysInfo.osComputerName || 'Unknown',
                            },
                            motherboard: {
                                manufacturer: sysInfo.motherboardManufacturer || 'Unknown',
                                model: sysInfo.motherboardModel || 'Unknown',
                                version: sysInfo.motherboardVersion || 'Unknown',
                                serial: sysInfo.motherboardSerial || 'Unknown',
                            },
                            bios: {
                                vendor: sysInfo.biosVendor || 'Unknown',
                                version: sysInfo.biosVersion || 'Unknown',
                                releaseDate: sysInfo.biosReleaseDate || 'Unknown',
                            },
                            cpu: {
                                brand: sysInfo.cpuBrand || 'Unknown',
                                manufacturer: sysInfo.cpuManufacturer || 'Unknown',
                                speed: sysInfo.cpuSpeed || 'Unknown',
                                cores: sysInfo.cpuCores || 'Unknown',
                                physicalCores: sysInfo.cpuPhysicalCores || 'Unknown',
                                processors: sysInfo.cpuProcessors || 'Unknown',
                                socket: sysInfo.cpuSocket || 'Unknown',
                            },
                            storage: {
                                primaryDrive: sysInfo.storagePrimary || 'Unknown',
                                totalSpace: sysInfo.storageTotal || 'Unknown',
                                freeSpace: sysInfo.storageFree || 'Unknown',
                                usedSpace: sysInfo.storageUsed || 'Unknown',
                            },
                            graphics: {
                                primaryGpu: sysInfo.graphicsPrimaryGpu || 'Unknown',
                                vendor: sysInfo.graphicsVendor || 'Unknown',
                                driverVersion: sysInfo.graphicsDriverVersion || 'Unknown',
                                resolution: sysInfo.graphicsResolution || 'Unknown',
                            },
                        };

                        if (window.electronAPI.saveFile) {
                            const result = await window.electronAPI.saveFile(
                                JSON.stringify(exportData, null, 2),
                                {
                                    title: 'Export System Information',
                                    defaultPath: `system-info-${new Date().toISOString().split('T')[0]}.json`,
                                    filters: [
                                        { name: 'JSON Files', extensions: ['json'] },
                                        { name: 'All Files', extensions: ['*'] },
                                    ],
                                }
                            );
                            if (result && result.filePath && window.showNotification) {
                                window.showNotification(
                                    'System information exported successfully!',
                                    'success'
                                );
                            }
                        }
                    } catch (error) {
                        window.electronAPI.logError(
                            `Error exporting system information: ${error.message}`,
                            'SystemInfoTab'
                        );
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
        // Get system info from Electron API
        if (window && window.electronAPI) {
            const sysInfo = await window.electronAPI.getSystemInfo();

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
            updateElement(
                container,
                'motherboard-manufacturer',
                sysInfo.motherboardManufacturer || 'Unknown'
            );
            updateElement(container, 'motherboard-model', sysInfo.motherboardModel || 'Unknown');
            updateElement(
                container,
                'motherboard-version',
                sysInfo.motherboardVersion || 'Unknown'
            );
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
            updateElement(
                container,
                'graphics-primary-gpu',
                sysInfo.graphicsPrimaryGpu || 'Unknown'
            );
            updateElement(container, 'graphics-vendor', sysInfo.graphicsVendor || 'Unknown');
            updateElement(container, 'graphics-driver', sysInfo.graphicsDriverVersion || 'Unknown');
            updateElement(
                container,
                'graphics-resolution',
                sysInfo.graphicsResolution || 'Unknown'
            );
        } else {
            updateElement(container, 'platform-info', 'Browser Mode');
            updateElement(container, 'arch-info', 'N/A');
            updateElement(container, 'hostname-info', 'localhost');
            updateElement(container, 'uptime-info', 'N/A');
        }

        // Signal that this tab is ready
        lazyHelper.markTabReady();
    } catch (error) {
        window.electronAPI.logError(`Error loading system info: ${error.message}`, 'SystemInfoTab');
        // Still signal ready even if there was an error
        lazyHelper.markTabReady();
    }
}

// Simple helper function to update elements
function updateElement(container, id, value) {
    try {
        const element = container.querySelector('#' + id);
        if (element) {
            element.textContent = value;
        } else {
            // Try to find it in the whole document as a fallback
            const globalElement = document.querySelector('#' + id);
            if (globalElement) {
                globalElement.textContent = value;
            }
        }
    } catch (error) {
        window.electronAPI.logError(
            `Error updating element ${id}: ${error.message}`,
            'SystemInfoTab'
        );
    }
}

// Create global reset function for refresh functionality
lazyHelper.createGlobalResetFunction();
