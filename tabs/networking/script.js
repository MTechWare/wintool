// Store event handlers to prevent duplicates
let networkButtonHandlersAttached = false;
let refreshButtonHandlerAttached = false;

function initNetworkingTab() {
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
        // Setup event listeners only once during initialization
        setupNetworkActionButtons(container);
        setupRefreshButton(container);
        // Load the initial data
        loadNetworkingInfo(container);
    } else {
        // Setup event listeners for document-level fallback
        setupNetworkActionButtons(document);
        setupRefreshButton(document);
        // Load the initial data
        loadNetworkingInfo(document);
    }
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNetworkingTab);
} else {
    initNetworkingTab();
}

function setupRefreshButton(container) {
    // Only attach event listener once
    if (refreshButtonHandlerAttached) {
        return;
    }

    const refreshBtn = container.querySelector('#refresh-networking-btn');
    if (refreshBtn) {
        refreshBtn.onclick = () => {
            loadNetworkingInfo(container);
        };
        refreshButtonHandlerAttached = true;
    }
}

function setupNetworkActionButtons(container) {
    // Only attach event listeners once
    if (networkButtonHandlersAttached) {
        return;
    }

    const flushDnsBtn = container.querySelector('#flush-dns-btn');
    const resetTcpIpBtn = container.querySelector('#reset-tcp-ip-btn');
    const renewDhcpBtn = container.querySelector('#renew-dhcp-btn');

    if (flushDnsBtn) {
        flushDnsBtn.onclick = async () => {
            await executeNetworkCommand(
                flushDnsBtn,
                'ipconfig /flushdns',
                'Flushing DNS cache...',
                'DNS cache flushed successfully!',
                'Failed to flush DNS cache',
                container
            );
        };
    }

    if (resetTcpIpBtn) {
        resetTcpIpBtn.onclick = async () => {
            const confirmed = confirm(
                'Resetting TCP/IP stack will require a system restart to take full effect. Continue?'
            );
            if (confirmed) {
                await executeNetworkCommand(
                    resetTcpIpBtn,
                    'netsh int ip reset',
                    'Resetting TCP/IP stack...',
                    'TCP/IP stack reset successfully! Please restart your computer.',
                    'Failed to reset TCP/IP stack',
                    container,
                    true // Requires admin
                );
            }
        };
    }

    if (renewDhcpBtn) {
        renewDhcpBtn.onclick = async () => {
            await executeNetworkCommand(
                renewDhcpBtn,
                'ipconfig /renew',
                'Renewing DHCP lease...',
                'DHCP lease renewed successfully!',
                'Failed to renew DHCP lease',
                container
            );
        };
    }

    networkButtonHandlersAttached = true;
}

async function loadNetworkingInfo(container) {
    try {
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

        // Signal that this tab is ready (only on first load)
        if (window.markTabAsReady && !container.hasAttribute('data-tab-ready')) {
            container.setAttribute('data-tab-ready', 'true');
            window.markTabAsReady('networking');
        }
    } catch (error) {
        console.error('Error loading networking info:', error);
        // Still signal ready even if there was an error (only on first load)
        if (window.markTabAsReady && !container.hasAttribute('data-tab-ready')) {
            container.setAttribute('data-tab-ready', 'true');
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
    updateElement(
        container,
        'primary-interface',
        primaryInterface ? primaryInterface.name : 'None'
    );
    updateElement(
        container,
        'connection-status',
        activeInterfaces > 0 ? 'Connected' : 'Disconnected'
    );
}

function displayNetworkInterfaces(container, networkInterfaces) {
    const interfacesContainer =
        container.querySelector('#network-interfaces-container') ||
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

// Helper function to execute network commands with proper feedback
async function executeNetworkCommand(button, command, loadingMessage, successMessage, errorMessage, container, requiresAdmin = false) {
    // Disable button and show loading state
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingMessage}`;

    try {
        // Show notification about the operation starting
        showNetworkNotification('info', loadingMessage);

        // Execute command with or without admin privileges
        const result = await window.electronAPI.runCommand(command, requiresAdmin);

        if (result.success) {
            showNetworkNotification('success', successMessage);
            // Refresh network info after successful command
            setTimeout(() => {
                loadNetworkingInfo(container);
            }, 1000);
        } else {
            throw new Error(result.stderr || result.message || 'Command failed');
        }
    } catch (error) {
        console.error(`Error executing ${command}:`, error);
        let userMessage = errorMessage;

        // Provide more specific error messages
        if (error.message.includes('cancelled') || error.message.includes('UAC')) {
            userMessage += ' (Administrator privileges required - UAC prompt may have been cancelled)';
        } else if (error.message.includes('Access is denied')) {
            userMessage += ' (Access denied - please run as administrator)';
        } else if (error.message) {
            userMessage += `: ${error.message}`;
        }

        showNetworkNotification('error', userMessage);
    } finally {
        // Restore button state
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

// Helper function to show network notifications using global notification system
function showNetworkNotification(type, message) {
    // Use the global notification system if available
    if (window.showNotification) {
        window.showNotification(message, type);
        return;
    }

    // Fallback to importing the notification module
    import('../../js/modules/notifications.js').then(({ showNotification }) => {
        showNotification(message, type);
    }).catch(() => {
        // Final fallback - create a simple notification
        console.log(`[${type.toUpperCase()}] ${message}`);

        // Create a simple notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            z-index: 10000;
            font-size: 14px;
            max-width: 350px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, type === 'error' ? 10000 : 5000);
    });
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
