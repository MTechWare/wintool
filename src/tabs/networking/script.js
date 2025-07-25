// Networking Tab JavaScript

function initNetworkingTab() {
    
    // Find the container
    let container = null;
    if (typeof tabContainer !== 'undefined') {
        container = tabContainer;
    }
    if (!container) {
        container = document.querySelector('[data-tab="folder-networking"]');
    }
    if (!container) {
        container = document.querySelector('.folder-tab-container');
    }
    
    if (container) {
        loadNetworkingInfo(container);
    } else {
        // Try to load anyway using global selectors
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
        // Setup action buttons
        setupNetworkActionButtons(container);
        setupRefreshButton(container);

        // Get system info from Electron API
        if (window && window.electronAPI) {
            const sysInfo = await window.electronAPI.getSystemInfo();

            // Process network interfaces
            const networkInterfaces = sysInfo.networkInterfaces || [];
            
            // Update overview cards
            updateNetworkOverview(container, networkInterfaces);
            
            // Display network interfaces
            displayNetworkInterfaces(container, networkInterfaces);

        } else {
            updateElement(container, 'total-interfaces', 'Browser Mode');
            updateElement(container, 'active-interfaces', 'N/A');
            updateElement(container, 'primary-interface', 'N/A');
            updateElement(container, 'connection-status', 'Unknown');
        }

        // Signal that this tab is ready
        if (window.markTabAsReady) {
            window.markTabAsReady('networking');
        }

    } catch (error) {
        console.error('Error loading networking info:', error);
        // Still signal ready even if there was an error
        if (window.markTabAsReady) {
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



// Helper function to update elements
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
        console.error('Error updating element', id, ':', error);
    }
}
