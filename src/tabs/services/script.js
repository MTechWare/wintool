// Services Manager Tab Script
console.log('Services Manager tab script loading...');

// Global variables
let allServices = [];
let filteredServices = [];
let currentFilter = { status: 'all', type: 'all', search: '' };
let quickAccessServices = [];
let availableServicesForModal = [];
let modalSearchFilter = '';

// Default common services for quick access
const defaultCommonServiceNames = [
    'wuauserv',      // Windows Update
    'spooler',       // Print Spooler
    'BITS',          // Background Intelligent Transfer Service
    'Themes',        // Themes
    'AudioSrv',      // Windows Audio
    'Dhcp',          // DHCP Client
    'Dnscache',      // DNS Client
    'EventLog',      // Windows Event Log
    'LanmanServer',  // Server
    'LanmanWorkstation', // Workstation
    'RpcSs',         // Remote Procedure Call (RPC)
    'Schedule',      // Task Scheduler
    'W32Time',       // Windows Time
    'Winmgmt',       // Windows Management Instrumentation
    'wscsvc',        // Security Center
    'MpsSvc',        // Windows Defender Firewall
    'WinDefend',     // Windows Defender Antivirus Service
    'Netman',        // Network Connections
    'NlaSvc',        // Network Location Awareness
    'PlugPlay'       // Plug and Play
];

// Initialize the tab when it loads
setTimeout(() => {
    console.log('Services Manager tab initializing...');
    
    // Find the container for this tab
    const container = document.querySelector('[data-tab="folder-services"]') || 
                     document.querySelector('.services-container') ||
                     document;
    
    console.log('Found container:', container);
    
    if (container) {
        initializeServicesManager(container);
    } else {
        console.error('No container found for services manager tab');
        // Try to initialize anyway using global selectors
        console.log('Attempting to initialize services manager using global selectors...');
        initializeServicesManager(document);
    }
}, 200);

async function initializeServicesManager(container) {
    try {
        console.log('initializeServicesManager called with container:', container);

        // Set up event listeners
        setupEventListeners(container);

        // Load services
        await loadServices(container);

        console.log('Services Manager initialized successfully');

        // Signal that this tab is ready
        if (window.markTabAsReady && typeof tabId !== 'undefined') {
            console.log('Marking services tab as ready');
            window.markTabAsReady(tabId);
        }

    } catch (error) {
        console.error('Error initializing Services Manager:', error);
        showError(container, 'Failed to initialize Services Manager: ' + error.message);
        // Still signal ready even if there was an error
        if (window.markTabAsReady && typeof tabId !== 'undefined') {
            console.log('Marking services tab as ready (after error)');
            window.markTabAsReady(tabId);
        }
    }
}

function setupEventListeners(container) {
    // Search input
    const searchInput = getElement(container, 'service-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentFilter.search = e.target.value.toLowerCase();
            applyFilters(container);
        });
    }
    
    // Status filter
    const statusFilter = getElement(container, 'status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            currentFilter.status = e.target.value;
            applyFilters(container);
        });
    }
    
    // Type filter
    const typeFilter = getElement(container, 'type-filter');
    if (typeFilter) {
        typeFilter.addEventListener('change', (e) => {
            currentFilter.type = e.target.value;
            applyFilters(container);
        });
    }
    
    // Refresh button
    const refreshBtn = getElement(container, 'refresh-services');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadServices(container);
        });
    }
    
    // Modal close buttons
    const closeDetailsModal = getElement(container, 'close-details-modal');
    if (closeDetailsModal) {
        closeDetailsModal.addEventListener('click', () => {
            hideModal(container, 'service-details-modal');
        });
    }
    
    // Customize quick access button
    const customizeBtn = getElement(container, 'customize-quick-access');
    if (customizeBtn) {
        customizeBtn.addEventListener('click', () => {
            openCustomizeModal(container);
        });
    }

    // Customize modal close button
    const closeCustomizeModal = getElement(container, 'close-customize-modal');
    if (closeCustomizeModal) {
        closeCustomizeModal.addEventListener('click', () => {
            hideModal(container, 'customize-modal');
        });
    }

    // Save quick access changes
    const saveQuickAccess = getElement(container, 'save-quick-access');
    if (saveQuickAccess) {
        saveQuickAccess.addEventListener('click', () => {
            saveQuickAccessChanges(container);
        });
    }

    // Reset to defaults
    const resetDefaults = getElement(container, 'reset-defaults');
    if (resetDefaults) {
        resetDefaults.addEventListener('click', () => {
            resetToDefaults(container);
        });
    }

    // Modal search input
    const modalSearchInput = getElement(container, 'service-search-modal');
    if (modalSearchInput) {
        modalSearchInput.addEventListener('input', (e) => {
            modalSearchFilter = e.target.value.toLowerCase();
            renderAvailableServices(container);
        });
    }

    // Close modal when clicking outside
    const detailsModal = getElement(container, 'service-details-modal');
    if (detailsModal) {
        detailsModal.addEventListener('click', (e) => {
            if (e.target === detailsModal) {
                hideModal(container, 'service-details-modal');
            }
        });
    }

    const progressModal = getElement(container, 'progress-modal');
    if (progressModal) {
        progressModal.addEventListener('click', (e) => {
            if (e.target === progressModal) {
                // Don't allow closing progress modal by clicking outside
            }
        });
    }

    const customizeModal = getElement(container, 'customize-modal');
    if (customizeModal) {
        customizeModal.addEventListener('click', (e) => {
            if (e.target === customizeModal) {
                hideModal(container, 'customize-modal');
            }
        });
    }
}

async function loadServices(container) {
    try {
        showLoading(container, true);
        
        if (window && window.electronAPI) {
            console.log('electronAPI available, calling getServices...');
            const services = await window.electronAPI.getServices();
            console.log('Services received:', services.length, 'services');
            
            allServices = services;
            await loadQuickAccessPreferences();
            applyFilters(container);
            updateServiceCount(container);
            renderQuickAccessServices(container);
            
        } else {
            console.log('electronAPI not available, using fallback');
            showError(container, 'Services management requires the desktop application');
        }
        
    } catch (error) {
        console.error('Error loading services:', error);
        showError(container, 'Failed to load services: ' + error.message);
    } finally {
        showLoading(container, false);
    }
}

function applyFilters(container) {
    filteredServices = allServices.filter(service => {
        // Status filter
        if (currentFilter.status !== 'all' && service.Status !== currentFilter.status) {
            return false;
        }
        
        // Type filter
        if (currentFilter.type === 'common' && !service.isCommonService) {
            return false;
        }
        if (currentFilter.type === 'system' && service.isCommonService) {
            return false;
        }
        
        // Search filter
        if (currentFilter.search) {
            const searchTerm = currentFilter.search;
            return service.Name.toLowerCase().includes(searchTerm) ||
                   service.DisplayName.toLowerCase().includes(searchTerm);
        }
        
        return true;
    });
    
    renderServicesTable(container);
    updateServiceCount(container);
}

function renderQuickAccessServices(container) {
    const quickGrid = getElement(container, 'quick-services-grid');
    if (!quickGrid) return;

    if (quickAccessServices.length === 0) {
        quickGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-cogs"></i>
                <p>No quick access services configured.<br>Click "Customize" to add services.</p>
            </div>
        `;
        return;
    }

    quickGrid.innerHTML = quickAccessServices.map(service => `
        <div class="quick-service-card">
            <div class="quick-service-header">
                <div class="quick-service-info">
                    <h4>${escapeHtml(service.DisplayName)}</h4>
                    <p>${escapeHtml(service.Name)}</p>
                </div>
                <span class="service-status status-${(service.Status || '').toString().toLowerCase()}">
                    ${service.Status}
                </span>
            </div>
            <div class="quick-service-actions">
                ${service.Status === 'Running' ?
                    `<button class="btn btn-warning btn-sm" onclick="controlService('${service.Name}', 'stop')">
                        <i class="fas fa-stop"></i> Stop
                    </button>` :
                    `<button class="btn btn-success btn-sm" onclick="controlService('${service.Name}', 'start')">
                        <i class="fas fa-play"></i> Start
                    </button>`
                }
                <button class="btn btn-info btn-sm" onclick="controlService('${service.Name}', 'restart')">
                    <i class="fas fa-redo"></i> Restart
                </button>
                <button class="btn btn-info btn-sm" onclick="showServiceDetails('${service.Name}')">
                    <i class="fas fa-info-circle"></i> Details
                </button>
            </div>
        </div>
    `).join('');
}

function renderServicesTable(container) {
    const tableBody = getElement(container, 'services-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = filteredServices.map(service => `
        <tr>
            <td>
                <span class="service-name">${escapeHtml(service.Name)}</span>
            </td>
            <td>
                <span class="service-display-name" title="${escapeHtml(service.DisplayName)}">
                    ${escapeHtml(service.DisplayName)}
                </span>
            </td>
            <td>
                <span class="service-status status-${(service.Status || '').toString().toLowerCase()}">
                    ${service.Status}
                </span>
            </td>
            <td>${escapeHtml(service.StartType || 'Unknown')}</td>
            <td>
                <div class="dependency-count">
                    <i class="fas fa-arrow-up"></i> ${service.dependencyCount}
                    <i class="fas fa-arrow-down"></i> ${service.dependentCount}
                </div>
            </td>
            <td>
                <div class="service-actions">
                    ${service.Status === 'Running' ?
                        `<button class="btn btn-warning btn-sm" onclick="controlService('${service.Name}', 'stop')" title="Stop Service">
                            <i class="fas fa-stop"></i>
                        </button>` :
                        `<button class="btn btn-success btn-sm" onclick="controlService('${service.Name}', 'start')" title="Start Service">
                            <i class="fas fa-play"></i>
                        </button>`
                    }
                    <button class="btn btn-info btn-sm" onclick="controlService('${service.Name}', 'restart')" title="Restart Service">
                        <i class="fas fa-redo"></i>
                    </button>
                    <button class="btn btn-info btn-sm" onclick="showServiceDetails('${service.Name}')" title="Service Details">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Global functions for button clicks
window.controlService = async function(serviceName, action) {
    try {
        const container = document.querySelector('[data-tab="folder-services"]') || document;
        
        showProgressModal(container, `${action.charAt(0).toUpperCase() + action.slice(1)}ing service...`, `Please wait while we ${action} the service "${serviceName}"`);
        
        if (window && window.electronAPI) {
            const result = await window.electronAPI.controlService(serviceName, action);
            console.log('Service control result:', result);
            
            hideModal(container, 'progress-modal');
            
            // Refresh services list
            await loadServices(container);
            
            // Show success message (you could add a toast notification here)
            console.log(`Service ${action} successful:`, result.message);
            
        } else {
            throw new Error('Desktop application required for service control');
        }
        
    } catch (error) {
        console.error(`Error ${action}ing service:`, error);
        const container = document.querySelector('[data-tab="folder-services"]') || document;
        hideModal(container, 'progress-modal');
        showError(container, `Failed to ${action} service: ${error.message}`);
    }
};

window.showServiceDetails = async function(serviceName) {
    try {
        const container = document.querySelector('[data-tab="folder-services"]') || document;
        
        showProgressModal(container, 'Loading service details...', `Getting detailed information for "${serviceName}"`);
        
        if (window && window.electronAPI) {
            const details = await window.electronAPI.getServiceDetails(serviceName);
            console.log('Service details received:', details);
            
            hideModal(container, 'progress-modal');
            displayServiceDetails(container, details);
            
        } else {
            throw new Error('Desktop application required for service details');
        }
        
    } catch (error) {
        console.error('Error getting service details:', error);
        const container = document.querySelector('[data-tab="folder-services"]') || document;
        hideModal(container, 'progress-modal');
        showError(container, 'Failed to get service details: ' + error.message);
    }
};

function displayServiceDetails(container, details) {
    const modal = getElement(container, 'service-details-modal');
    const modalTitle = getElement(container, 'modal-service-name');
    const modalContent = getElement(container, 'service-details-content');

    if (!modal || !modalTitle || !modalContent) return;

    modalTitle.textContent = `${details.DisplayName} (${details.Name})`;

    modalContent.innerHTML = `
        <div class="service-detail-grid">
            <div class="detail-card">
                <h4>Basic Information</h4>
                <div class="detail-row">
                    <span class="label">Service Name:</span>
                    <span class="value">${escapeHtml(details.Name)}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Display Name:</span>
                    <span class="value">${escapeHtml(details.DisplayName)}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Status:</span>
                    <span class="value">
                        <span class="service-status status-${(details.Status || '').toString().toLowerCase()}">
                            ${details.Status}
                        </span>
                    </span>
                </div>
                <div class="detail-row">
                    <span class="label">Start Type:</span>
                    <span class="value">${escapeHtml(details.StartType)}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Service Type:</span>
                    <span class="value">${escapeHtml(details.ServiceType)}</span>
                </div>
            </div>

            <div class="detail-card">
                <h4>Capabilities</h4>
                <div class="detail-row">
                    <span class="label">Can Stop:</span>
                    <span class="value">${details.CanStop ? 'Yes' : 'No'}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Can Pause:</span>
                    <span class="value">${details.CanPauseAndContinue ? 'Yes' : 'No'}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Can Shutdown:</span>
                    <span class="value">${details.CanShutdown ? 'Yes' : 'No'}</span>
                </div>
                ${details.ProcessId ? `
                <div class="detail-row">
                    <span class="label">Process ID:</span>
                    <span class="value">${details.ProcessId}</span>
                </div>
                ` : ''}
                ${details.StartName ? `
                <div class="detail-row">
                    <span class="label">Start Name:</span>
                    <span class="value">${escapeHtml(details.StartName)}</span>
                </div>
                ` : ''}
            </div>
        </div>

        ${details.Description ? `
        <div class="detail-card">
            <h4>Description</h4>
            <p style="margin: 0; color: var(--text-primary); line-height: 1.5;">
                ${escapeHtml(details.Description)}
            </p>
        </div>
        ` : ''}

        ${details.PathName ? `
        <div class="detail-card">
            <h4>Executable Path</h4>
            <p style="margin: 0; color: var(--text-primary); font-family: 'Courier New', monospace; font-size: 12px; word-break: break-all;">
                ${escapeHtml(details.PathName)}
            </p>
        </div>
        ` : ''}

        ${details.ServicesDependedOn && details.ServicesDependedOn.length > 0 ? `
        <div class="detail-card">
            <h4>Dependencies (${details.ServicesDependedOn.length})</h4>
            <div class="dependency-list">
                ${details.ServicesDependedOn.map(dep =>
                    `<div class="dependency-item">${escapeHtml(dep)}</div>`
                ).join('')}
            </div>
        </div>
        ` : ''}

        ${details.DependentServices && details.DependentServices.length > 0 ? `
        <div class="detail-card">
            <h4>Dependent Services (${details.DependentServices.length})</h4>
            <div class="dependency-list">
                ${details.DependentServices.map(dep =>
                    `<div class="dependency-item">${escapeHtml(dep)}</div>`
                ).join('')}
            </div>
        </div>
        ` : ''}
    `;

    showModal(container, 'service-details-modal');
}

// Utility functions
function getElement(container, id) {
    return container.querySelector(`#${id}`) || document.querySelector(`#${id}`);
}

function updateElement(container, id, content) {
    const element = getElement(container, id);
    if (element) {
        element.textContent = content;
    }
}

function showLoading(container, show) {
    const loadingContainer = getElement(container, 'loading-container');
    const servicesContainer = container.querySelector('.services-list-section') ||
                             document.querySelector('.services-list-section');

    if (loadingContainer) {
        loadingContainer.style.display = show ? 'flex' : 'none';
    }
    if (servicesContainer) {
        servicesContainer.style.display = show ? 'none' : 'block';
    }
}

function showError(container, message) {
    console.error('Services Manager Error:', message);
    // You could implement a toast notification system here
    alert('Error: ' + message);
}

function updateServiceCount(container) {
    const countElement = getElement(container, 'service-count');
    if (countElement) {
        countElement.textContent = `${filteredServices.length} of ${allServices.length} services`;
    }
}

function showModal(container, modalId) {
    const modal = getElement(container, modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function hideModal(container, modalId) {
    const modal = getElement(container, modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function showProgressModal(container, title, message) {
    const modal = getElement(container, 'progress-modal');
    const titleElement = getElement(container, 'progress-title');
    const messageElement = getElement(container, 'progress-message');

    if (titleElement) titleElement.textContent = title;
    if (messageElement) messageElement.textContent = message;

    showModal(container, 'progress-modal');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Quick Access Customization Functions
async function loadQuickAccessPreferences() {
    try {
        if (window && window.electronAPI) {
            const savedServices = await window.electronAPI.getSetting('quickAccessServices', null);
            if (savedServices && Array.isArray(savedServices)) {
                // Filter to only include services that still exist
                quickAccessServices = allServices.filter(service =>
                    savedServices.includes(service.Name)
                );
            } else {
                // Use default services
                quickAccessServices = allServices.filter(service =>
                    defaultCommonServiceNames.includes(service.Name)
                );
            }
        } else {
            // Fallback to defaults
            quickAccessServices = allServices.filter(service =>
                defaultCommonServiceNames.includes(service.Name)
            );
        }
    } catch (error) {
        console.error('Error loading quick access preferences:', error);
        // Fallback to defaults
        quickAccessServices = allServices.filter(service =>
            defaultCommonServiceNames.includes(service.Name)
        );
    }
}

async function saveQuickAccessPreferences() {
    try {
        if (window && window.electronAPI) {
            const serviceNames = quickAccessServices.map(service => service.Name);
            await window.electronAPI.setSetting('quickAccessServices', serviceNames);
        }
    } catch (error) {
        console.error('Error saving quick access preferences:', error);
    }
}

function openCustomizeModal(container) {
    // Prepare available services (exclude already added ones)
    availableServicesForModal = allServices.filter(service =>
        !quickAccessServices.some(qa => qa.Name === service.Name)
    );

    modalSearchFilter = '';

    renderCurrentServices(container);
    renderAvailableServices(container);

    // Clear search input
    const searchInput = getElement(container, 'service-search-modal');
    if (searchInput) {
        searchInput.value = '';
    }

    showModal(container, 'customize-modal');
}

function renderCurrentServices(container) {
    const currentContainer = getElement(container, 'current-services');
    if (!currentContainer) return;

    if (quickAccessServices.length === 0) {
        currentContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No services in quick access</p>
            </div>
        `;
        return;
    }

    currentContainer.innerHTML = quickAccessServices.map(service => `
        <div class="current-service-item">
            <div class="current-service-info">
                <div class="current-service-name">${escapeHtml(service.Name)}</div>
                <div class="current-service-display">${escapeHtml(service.DisplayName)}</div>
            </div>
            <button class="remove-service-btn" onclick="removeFromQuickAccess('${service.Name}')">
                <i class="fas fa-times"></i> Remove
            </button>
        </div>
    `).join('');
}

function renderAvailableServices(container) {
    const availableContainer = getElement(container, 'available-services');
    if (!availableContainer) return;

    let filteredAvailable = availableServicesForModal;

    if (modalSearchFilter) {
        filteredAvailable = availableServicesForModal.filter(service =>
            service.Name.toLowerCase().includes(modalSearchFilter) ||
            service.DisplayName.toLowerCase().includes(modalSearchFilter)
        );
    }

    if (filteredAvailable.length === 0) {
        availableContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>${modalSearchFilter ? 'No services found matching your search' : 'All services are already in quick access'}</p>
            </div>
        `;
        return;
    }

    availableContainer.innerHTML = filteredAvailable.map(service => `
        <div class="available-service-item">
            <div class="available-service-info">
                <div class="available-service-name">${escapeHtml(service.Name)}</div>
                <div class="available-service-display">${escapeHtml(service.DisplayName)}</div>
            </div>
            <button class="add-service-btn" onclick="addToQuickAccess('${service.Name}')">
                <i class="fas fa-plus"></i> Add
            </button>
        </div>
    `).join('');
}

// Global functions for modal interactions
window.removeFromQuickAccess = function(serviceName) {
    quickAccessServices = quickAccessServices.filter(service => service.Name !== serviceName);

    // Add back to available services
    const serviceToAdd = allServices.find(service => service.Name === serviceName);
    if (serviceToAdd) {
        availableServicesForModal.push(serviceToAdd);
    }

    const container = document.querySelector('[data-tab="folder-services"]') || document;
    renderCurrentServices(container);
    renderAvailableServices(container);
};

window.addToQuickAccess = function(serviceName) {
    const serviceToAdd = allServices.find(service => service.Name === serviceName);
    if (serviceToAdd) {
        quickAccessServices.push(serviceToAdd);

        // Remove from available services
        availableServicesForModal = availableServicesForModal.filter(service => service.Name !== serviceName);

        const container = document.querySelector('[data-tab="folder-services"]') || document;
        renderCurrentServices(container);
        renderAvailableServices(container);
    }
};

async function saveQuickAccessChanges(container) {
    try {
        await saveQuickAccessPreferences();
        renderQuickAccessServices(container);
        hideModal(container, 'customize-modal');

        // Show success message (you could implement a toast notification here)
        console.log('Quick access services saved successfully');

    } catch (error) {
        console.error('Error saving quick access changes:', error);
        showError(container, 'Failed to save quick access changes: ' + error.message);
    }
}

function resetToDefaults(container) {
    quickAccessServices = allServices.filter(service =>
        defaultCommonServiceNames.includes(service.Name)
    );

    availableServicesForModal = allServices.filter(service =>
        !quickAccessServices.some(qa => qa.Name === service.Name)
    );

    renderCurrentServices(container);
    renderAvailableServices(container);
}
