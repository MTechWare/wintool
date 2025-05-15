/**
 * WinTool - Network Tab
 * Provides network status information, tools, and optimization features
 */

// ===================================================
// INITIALIZATION
// ===================================================

/**
 * Initialize the network tab
 * Sets up all components and event listeners
 */
function initNetworkTab() {
    console.log('Initializing Network Tab');

    // Get network status
    updateNetworkStatus();

    // Set up event listeners for network tools
    setupNetworkTools();

    // Set up event listeners for network optimization
    setupNetworkOptimization();

    // Set up event listeners for network diagnostics
    setupNetworkDiagnostics();
}

// ===================================================
// NETWORK STATUS
// ===================================================

/**
 * Update network status information
 * Fetches current network state and updates UI
 */
async function updateNetworkStatus() {
    try {
        const networkInfo = await window.electronAPI.getNetworkInfo();

        if (networkInfo.error) {
            showErrorNotification(`Error getting network info: ${networkInfo.error}`);
            return;
        }

        // Update UI with network information
        document.getElementById('connection-type').textContent = networkInfo.connectionType || 'Unknown';
        document.getElementById('ip-address').textContent = networkInfo.ipAddress || 'Unknown';
        document.getElementById('dns-servers').textContent = networkInfo.dnsServers?.join(', ') || 'Unknown';

        // Update internet status with icon
        const internetStatusElement = document.getElementById('internet-status');
        if (networkInfo.internetConnected) {
            internetStatusElement.innerHTML = '<span class="status-connected"><i class="fas fa-check-circle"></i> Connected</span>';
        } else {
            internetStatusElement.innerHTML = '<span class="status-disconnected"><i class="fas fa-times-circle"></i> Disconnected</span>';
        }
    } catch (error) {
        console.error('Error updating network status:', error);
        showErrorNotification('Failed to update network status');
    }
}

// ===================================================
// NETWORK TOOLS
// ===================================================

/**
 * Set up event listeners for network tools
 * Handles DNS flushing, IP renewal, network reset, and settings
 */
function setupNetworkTools() {
    // Flush DNS
    document.getElementById('flush-dns').addEventListener('click', async () => {
        try {
            showNotification('Flushing DNS cache...', { duration: 2000 });
            const result = await window.electronAPI.flushDns();

            if (result.error) {
                showErrorNotification(`Error flushing DNS: ${result.error}`);
            } else {
                showNotification('DNS cache flushed successfully!', {
                    type: 'success',
                    duration: 3000
                });
            }
        } catch (error) {
            console.error('Error flushing DNS:', error);
            showErrorNotification('Failed to flush DNS cache');
        }
    });

    // Release/Renew IP
    document.getElementById('release-renew').addEventListener('click', async () => {
        try {
            showNotification('Releasing and renewing IP address...', { duration: 5000 });
            const result = await window.electronAPI.releaseRenewIp();

            if (result.error) {
                showErrorNotification(`Error releasing/renewing IP: ${result.error}`);
            } else {
                showNotification('IP address released and renewed successfully!', {
                    type: 'success',
                    duration: 3000
                });
                // Update network status after IP renewal
                setTimeout(updateNetworkStatus, 1000);
            }
        } catch (error) {
            console.error('Error releasing/renewing IP:', error);
            showErrorNotification('Failed to release/renew IP address');
        }
    });

    // Network Reset
    document.getElementById('network-reset').addEventListener('click', async () => {
        // Confirm before resetting network
        if (confirm('Are you sure you want to reset all network adapters? This will temporarily disconnect your network connections.')) {
            try {
                showNotification('Resetting network adapters...', { duration: 5000 });
                const result = await window.electronAPI.resetNetwork();

                if (result.error) {
                    showErrorNotification(`Error resetting network: ${result.error}`);
                } else {
                    showNotification(result.message || 'Network reset successfully!', {
                        type: 'success',
                        duration: 3000
                    });
                    // Update network status after reset
                    setTimeout(updateNetworkStatus, 1000);
                }
            } catch (error) {
                console.error('Error resetting network:', error);
                showErrorNotification('Failed to reset network adapters');
            }
        }
    });

    // Open Network Settings
    document.getElementById('open-network-settings').addEventListener('click', async () => {
        try {
            await window.electronAPI.openNetworkSettings();
        } catch (error) {
            console.error('Error opening network settings:', error);
            showErrorNotification('Failed to open network settings');
        }
    });
}

// ===================================================
// NETWORK OPTIMIZATION
// ===================================================

/**
 * Set up event listeners for network optimization
 * Handles various network optimization options
 */
function setupNetworkOptimization() {
    document.getElementById('run-network-optimization').addEventListener('click', async () => {
        const optimizeDns = document.getElementById('optimize-dns').checked;
        const optimizeTcp = document.getElementById('optimize-tcp').checked;
        const optimizeNetsh = document.getElementById('optimize-netsh').checked;

        // If no optimizations selected, show error
        if (!optimizeDns && !optimizeTcp && !optimizeNetsh) {
            showErrorNotification('Please select at least one optimization option');
            return;
        }

        try {
            const statusElement = document.getElementById('optimization-status');
            statusElement.textContent = 'Optimizing network settings...';
            statusElement.className = 'status-message status-running';

            const result = await window.electronAPI.optimizeNetwork({
                dns: optimizeDns,
                tcp: optimizeTcp,
                netsh: optimizeNetsh
            });

            if (result.error) {
                statusElement.textContent = `Error: ${result.error}`;
                statusElement.className = 'status-message status-error';
                showErrorNotification(`Error optimizing network: ${result.error}`);
            } else {
                // Show detailed results if available
                if (result.results) {
                    let detailsText = 'Network optimization completed with the following results:\n';

                    // DNS Optimizations
                    if (result.results.dns.applied) {
                        detailsText += '\n✅ DNS Optimizations:\n';
                        result.results.dns.details.forEach(detail => {
                            detailsText += `  • ${detail}\n`;
                        });
                    } else if (optimizeDns) {
                        detailsText += '\n❌ DNS Optimizations failed:\n';
                        if (result.results.dns.details.length > 0) {
                            result.results.dns.details.forEach(detail => {
                                detailsText += `  • ${detail}\n`;
                            });
                        } else {
                            detailsText += '  • No details available\n';
                        }
                    }

                    // TCP Optimizations
                    if (result.results.tcp.applied) {
                        detailsText += '\n✅ TCP Optimizations:\n';
                        result.results.tcp.details.forEach(detail => {
                            detailsText += `  • ${detail}\n`;
                        });
                    } else if (optimizeTcp) {
                        detailsText += '\n❌ TCP Optimizations failed:\n';
                        if (result.results.tcp.details.length > 0) {
                            result.results.tcp.details.forEach(detail => {
                                detailsText += `  • ${detail}\n`;
                            });
                        } else {
                            detailsText += '  • No details available\n';
                        }
                    }

                    // Netsh Optimizations
                    if (result.results.netsh.applied) {
                        detailsText += '\n✅ Netsh Optimizations:\n';
                        result.results.netsh.details.forEach(detail => {
                            detailsText += `  • ${detail}\n`;
                        });
                    } else if (optimizeNetsh) {
                        detailsText += '\n❌ Netsh Optimizations failed:\n';
                        if (result.results.netsh.details.length > 0) {
                            result.results.netsh.details.forEach(detail => {
                                detailsText += `  • ${detail}\n`;
                            });
                        } else {
                            detailsText += '  • No details available\n';
                        }
                    }

                    // Update status element with detailed results
                    statusElement.textContent = 'Network optimization completed!';
                    statusElement.className = 'status-message status-success';

                    // Create a details element to show the results
                    const detailsElement = document.createElement('pre');
                    detailsElement.className = 'optimization-details';
                    detailsElement.textContent = detailsText;

                    // Replace any existing details element
                    const existingDetails = document.querySelector('.optimization-details');
                    if (existingDetails) {
                        existingDetails.remove();
                    }

                    // Add the details element after the status element
                    statusElement.parentNode.insertBefore(detailsElement, statusElement.nextSibling);
                } else {
                    statusElement.textContent = 'Network optimization completed successfully!';
                }

                statusElement.className = 'status-message status-success';
                showNotification('Network optimization completed successfully!', {
                    type: 'success',
                    duration: 3000
                });

                // Update network status after optimization
                setTimeout(updateNetworkStatus, 1000);
            }
        } catch (error) {
            console.error('Error optimizing network:', error);
            const statusElement = document.getElementById('optimization-status');
            statusElement.textContent = 'Failed to optimize network settings';
            statusElement.className = 'status-message status-error';
            showErrorNotification('Failed to optimize network settings');
        }
    });
}

// ===================================================
// NETWORK DIAGNOSTICS
// ===================================================

/**
 * Set up event listeners for network diagnostics
 * Handles ping tests and other diagnostic tools
 */
function setupNetworkDiagnostics() {
    document.getElementById('run-ping').addEventListener('click', async () => {
        const target = document.getElementById('ping-target').value.trim();

        if (!target) {
            showErrorNotification('Please enter a hostname or IP address');
            return;
        }

        try {
            const resultsElement = document.getElementById('diagnostic-results');
            resultsElement.textContent = 'Running ping test...';

            const result = await window.electronAPI.runPingTest(target);

            if (result.error) {
                resultsElement.textContent = `Error: ${result.error}`;
                showErrorNotification(`Error running ping test: ${result.error}`);
            } else {
                resultsElement.textContent = result.output;
            }
        } catch (error) {
            console.error('Error running ping test:', error);
            document.getElementById('diagnostic-results').textContent = 'Failed to run ping test';
            showErrorNotification('Failed to run ping test');
        }
    });
}

// ===================================================
// EVENT LISTENERS
// ===================================================

// Export the initialization function to make it globally available
window.initNetworkTab = initNetworkTab;
