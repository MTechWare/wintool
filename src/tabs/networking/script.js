// Networking Tab JavaScript
console.log('=== Networking tab JavaScript loaded! ===');

function initNetworkingTab() {
    console.log('Looking for networking tab container...');
    
    // Find the container
    let container = null;
    if (typeof tabContainer !== 'undefined') {
        container = tabContainer;
        console.log('Using provided tabContainer');
    }
    if (!container) {
        container = document.querySelector('[data-tab="folder-networking"]');
        console.log('Found container via data-tab selector');
    }
    if (!container) {
        container = document.querySelector('.folder-tab-container');
        console.log('Found container via class selector');
    }
    
    console.log('Found container:', container);
    
    if (container) {
        loadNetworkingInfo(container);
    } else {
        console.error('No container found for networking tab');
        // Try to load anyway using global selectors
        console.log('Attempting to load networking info using global selectors...');
        loadNetworkingInfo(document);
    }
}

// Initialize when the script is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNetworkingTab);
} else {
    initNetworkingTab();
}

function setupRefreshButton(container) {
    const refreshBtn = container.querySelector('#refresh-networking-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadNetworkingInfo(container);
        });
    }
}

function setupNetworkActionButtons(container) {
    const flushDnsBtn = container.querySelector('#flush-dns-btn');
    const resetTcpIpBtn = container.querySelector('#reset-tcp-ip-btn');
    const renewDhcpBtn = container.querySelector('#renew-dhcp-btn');

    if (flushDnsBtn) {
        flushDnsBtn.addEventListener('click', async () => {
            try {
                const result = await window.electronAPI.runCommand('ipconfig /flushdns');
                console.log('Flush DNS result:', result);
                if (result.success) {
                    loadNetworkingInfo(container);
                }
            } catch (error) {
                console.error('Error flushing DNS:', error);
            }
        });
    }

    if (resetTcpIpBtn) {
        resetTcpIpBtn.addEventListener('click', async () => {
            try {
                const result = await window.electronAPI.runCommand('netsh int ip reset');
                console.log('Reset TCP/IP result:', result);
                if (result.success) {
                    loadNetworkingInfo(container);
                }
            } catch (error) {
                console.error('Error resetting TCP/IP:', error);
            }
        });
    }

    if (renewDhcpBtn) {
        renewDhcpBtn.addEventListener('click', async () => {
            try {
                const result = await window.electronAPI.runCommand('ipconfig /renew');
                console.log('Renew DHCP result:', result);
                if (result.success) {
                    loadNetworkingInfo(container);
                }
            } catch (error) {
                console.error('Error renewing DHCP lease:', error);
            }
        });
    }
}

async function loadNetworkingInfo(container) {
    try {
        console.log('loadNetworkingInfo called with container:', container);
        
        // Setup action buttons
        setupNetworkActionButtons(container);
        setupRefreshButton(container);

        // Get system info from Electron API
        if (window && window.electronAPI) {
            console.log('electronAPI available, calling getSystemInfo...');
            const sysInfo = await window.electronAPI.getSystemInfo();
            console.log('System info received:', sysInfo);
            
            // Process network interfaces
            const networkInterfaces = sysInfo.networkInterfaces || [];
            console.log('Network interfaces:', networkInterfaces);
            
            // Update overview cards
            updateNetworkOverview(container, networkInterfaces);
            
            // Display network interfaces
            displayNetworkInterfaces(container, networkInterfaces);
            
            // Update network statistics with real data
            await updateNetworkStatistics(container);
            
            console.log('Networking info updated successfully');

        } else {
            console.log('electronAPI not available, using fallback');
            updateElement(container, 'total-interfaces', 'Browser Mode');
            updateElement(container, 'active-interfaces', 'N/A');
            updateElement(container, 'primary-interface', 'N/A');
            updateElement(container, 'connection-status', 'Unknown');
        }

        // Signal that this tab is ready
        if (window.markTabAsReady) {
            console.log('Marking networking tab as ready');
            window.markTabAsReady('networking');
        }

    } catch (error) {
        console.error('Error loading networking info:', error);
        // Still signal ready even if there was an error
        if (window.markTabAsReady) {
            console.log('Marking networking tab as ready (after error)');
            window.markTabAsReady('networking');
        }
    }
}

function updateNetworkOverview(container, networkInterfaces) {
    const totalInterfaces = networkInterfaces.length;
    const activeInterfaces = networkInterfaces.filter(iface => iface.operstate === 'up').length;
    const primaryInterface = networkInterfaces.find(iface => iface.operstate === 'up');
    
    updateElement(container, 'total-interfaces', totalInterfaces.toString());
    updateElement(container, 'active-interfaces', activeInterfaces.toString());
    updateElement(container, 'primary-interface', primaryInterface ? primaryInterface.name : 'None');
    updateElement(container, 'connection-status', activeInterfaces > 0 ? 'Connected' : 'Disconnected');
}

function displayNetworkInterfaces(container, networkInterfaces) {
    const interfacesContainer = container.querySelector('#network-interfaces-container') || 
                               document.querySelector('#network-interfaces-container');
    
    if (!interfacesContainer) {
        console.error('Network interfaces container not found');
        return;
    }
    
    // Clear existing content
    interfacesContainer.innerHTML = '';
    
    if (networkInterfaces.length === 0) {
        interfacesContainer.innerHTML = '<p class="no-interfaces">No network interfaces found</p>';
        return;
    }
    
    networkInterfaces.forEach(iface => {
        const interfaceCard = createInterfaceCard(iface);
        interfacesContainer.appendChild(interfaceCard);
    });
}

function createInterfaceCard(iface) {
    const card = document.createElement('div');
    card.className = 'interface-card';
    
    // Determine interface icon based on type
    let icon = 'fas fa-network-wired';
    if (iface.type && iface.type.toLowerCase().includes('wireless')) {
        icon = 'fas fa-wifi';
    } else if (iface.type && iface.type.toLowerCase().includes('ethernet')) {
        icon = 'fas fa-ethernet';
    } else if (iface.type && iface.type.toLowerCase().includes('bluetooth')) {
        icon = 'fab fa-bluetooth';
    }
    
    card.innerHTML = `
        <div class="interface-header">
            <i class="${icon} interface-icon"></i>
            <div class="interface-info">
                <h4>${iface.name || 'Unknown Interface'}</h4>
                <p class="interface-type">${iface.type || 'Unknown Type'}</p>
            </div>
            <span class="interface-status ${iface.operstate === 'up' ? 'up' : 'down'}">
                ${iface.operstate === 'up' ? 'Connected' : 'Disconnected'}
            </span>
        </div>
        <div class="interface-details">
            <div class="detail-row">
                <span class="label">Speed:</span>
                <span>${iface.speed || 'Unknown'}</span>
            </div>
            <div class="detail-row">
                <span class="label">IPv4 Address:</span>
                <span>${iface.ip4 || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <span class="label">IPv6 Address:</span>
                <span>${iface.ip6 || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <span class="label">MAC Address:</span>
                <span>${iface.mac || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <span class="label">Status:</span>
                <span>${iface.operstate || 'Unknown'}</span>
            </div>
        </div>
    `;
    
    return card;
}

async function updateNetworkStatistics(container) {
    try {
        if (window && window.electronAPI && window.electronAPI.getNetworkStats) {
            console.log('Getting network statistics...');
            const networkStats = await window.electronAPI.getNetworkStats();
            console.log('Network statistics received:', networkStats);

            if (networkStats && networkStats.totals) {
                updateElement(container, 'total-rx-bytes', networkStats.totals.rx_bytes);
                updateElement(container, 'total-rx-packets', networkStats.totals.total_packets_rx);
                updateElement(container, 'total-rx-errors', networkStats.totals.rx_errors.toString());
                updateElement(container, 'total-tx-bytes', networkStats.totals.tx_bytes);
                updateElement(container, 'total-tx-packets', networkStats.totals.total_packets_tx);
                updateElement(container, 'total-tx-errors', networkStats.totals.tx_errors.toString());
            } else {
                console.warn('No network statistics data received');
                updateElement(container, 'total-rx-bytes', 'N/A');
                updateElement(container, 'total-rx-packets', 'N/A');
                updateElement(container, 'total-rx-errors', 'N/A');
                updateElement(container, 'total-tx-bytes', 'N/A');
                updateElement(container, 'total-tx-packets', 'N/A');
                updateElement(container, 'total-tx-errors', 'N/A');
            }
        } else {
            console.log('Network stats API not available, using fallback');
            updateElement(container, 'total-rx-bytes', 'N/A');
            updateElement(container, 'total-rx-packets', 'N/A');
            updateElement(container, 'total-rx-errors', 'N/A');
            updateElement(container, 'total-tx-bytes', 'N/A');
            updateElement(container, 'total-tx-packets', 'N/A');
            updateElement(container, 'total-tx-errors', 'N/A');
        }
    } catch (error) {
        console.error('Error updating network statistics:', error);
        updateElement(container, 'total-rx-bytes', 'Error');
        updateElement(container, 'total-rx-packets', 'Error');
        updateElement(container, 'total-rx-errors', 'Error');
        updateElement(container, 'total-tx-bytes', 'Error');
        updateElement(container, 'total-tx-packets', 'Error');
        updateElement(container, 'total-tx-errors', 'Error');
    }
}

// Helper function to update elements
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
