// Services Manager Tab Script
console.log('Services Manager tab script loading...');

// Global variables
let allServices = [];
let filteredServices = [];
let currentFilter = { status: 'all', type: 'all', search: '' };
let quickAccessServices = [];
let availableServicesForModal = [];
let modalSearchFilter = '';

// Security configuration
const SECURITY_CONFIG = {
    allowedServiceActions: ['start', 'stop', 'restart'],
    serviceNameMaxLength: 100,
    serviceNamePattern: /^[a-zA-Z0-9_.-]+$/,
    criticalServices: [
        'winlogon', 'csrss', 'wininit', 'services', 'lsass', 'svchost',
        'explorer', 'dwm', 'audiodg', 'conhost', 'smss'
    ]
};

// Security validation functions
function validateServiceName(serviceName) {
    if (!serviceName || typeof serviceName !== 'string') {
        return false;
    }

    if (serviceName.length > SECURITY_CONFIG.serviceNameMaxLength) {
        return false;
    }

    return SECURITY_CONFIG.serviceNamePattern.test(serviceName);
}

function validateServiceAction(action) {
    return SECURITY_CONFIG.allowedServiceActions.includes(action);
}

function isCriticalService(serviceName) {
    return SECURITY_CONFIG.criticalServices.includes(serviceName.toLowerCase());
}

function sanitizeServiceName(serviceName) {
    if (!serviceName) return '';
    return serviceName.replace(/[^a-zA-Z0-9_.-]/g, '');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function createSecureButton(text, onclick, className = '', title = '') {
    const button = document.createElement('button');
    button.className = className;
    button.innerHTML = text;
    button.title = title;
    button.onclick = onclick;
    return button;
}

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

function initServicesTab() {
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
}

// Initialize the tab when it loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initServicesTab);
} else {
    initServicesTab();
}

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

    // Clear existing content
    quickGrid.innerHTML = '';

    // Create service cards securely using DOM methods
    quickAccessServices.forEach(service => {
        if (!validateServiceName(service.Name)) {
            console.warn('Invalid service name detected:', service.Name);
            return;
        }

        const card = document.createElement('div');
        card.className = 'quick-service-card';

        const header = document.createElement('div');
        header.className = 'quick-service-header';

        const info = document.createElement('div');
        info.className = 'quick-service-info';

        const title = document.createElement('h4');
        title.textContent = service.DisplayName || 'Unknown Service';

        const name = document.createElement('p');
        name.textContent = service.Name || 'Unknown';

        const status = document.createElement('span');
        status.className = `service-status status-${(service.Status || '').toString().toLowerCase()}`;
        status.textContent = service.Status || 'Unknown';

        info.appendChild(title);
        info.appendChild(name);
        header.appendChild(info);
        header.appendChild(status);

        const actions = document.createElement('div');
        actions.className = 'quick-service-actions';

        // Create action buttons securely
        if (service.Status === 'Running') {
            const stopBtn = createSecureButton(
                '<i class="fas fa-stop"></i> Stop',
                () => controlServiceSecure(service.Name, 'stop'),
                'btn btn-warning btn-sm',
                'Stop Service'
            );
            actions.appendChild(stopBtn);
        } else {
            const startBtn = createSecureButton(
                '<i class="fas fa-play"></i> Start',
                () => controlServiceSecure(service.Name, 'start'),
                'btn btn-success btn-sm',
                'Start Service'
            );
            actions.appendChild(startBtn);
        }

        const restartBtn = createSecureButton(
            '<i class="fas fa-redo"></i> Restart',
            () => controlServiceSecure(service.Name, 'restart'),
            'btn btn-info btn-sm',
            'Restart Service'
        );
        actions.appendChild(restartBtn);

        const detailsBtn = createSecureButton(
            '<i class="fas fa-info-circle"></i> Details',
            () => showServiceDetailsSecure(service.Name),
            'btn btn-info btn-sm',
            'Service Details'
        );
        actions.appendChild(detailsBtn);

        card.appendChild(header);
        card.appendChild(actions);
        quickGrid.appendChild(card);
    });
}

function renderServicesTable(container) {
    const tableBody = getElement(container, 'services-table-body');
    if (!tableBody) return;

    // Clear existing content
    tableBody.innerHTML = '';

    // Create table rows securely using DOM methods
    filteredServices.forEach(service => {
        if (!validateServiceName(service.Name)) {
            console.warn('Invalid service name detected:', service.Name);
            return;
        }

        const row = document.createElement('tr');

        // Service name cell
        const nameCell = document.createElement('td');
        const nameSpan = document.createElement('span');
        nameSpan.className = 'service-name';
        nameSpan.textContent = service.Name || 'Unknown';
        nameCell.appendChild(nameSpan);

        // Display name cell
        const displayCell = document.createElement('td');
        const displaySpan = document.createElement('span');
        displaySpan.className = 'service-display-name';
        displaySpan.title = service.DisplayName || 'Unknown Service';
        displaySpan.textContent = service.DisplayName || 'Unknown Service';
        displayCell.appendChild(displaySpan);

        // Status cell
        const statusCell = document.createElement('td');
        const statusSpan = document.createElement('span');
        statusSpan.className = `service-status status-${(service.Status || '').toString().toLowerCase()}`;
        statusSpan.textContent = service.Status || 'Unknown';
        statusCell.appendChild(statusSpan);

        // Start type cell
        const startTypeCell = document.createElement('td');
        startTypeCell.textContent = service.StartType || 'Unknown';

        // Dependencies cell
        const depCell = document.createElement('td');
        const depDiv = document.createElement('div');
        depDiv.className = 'dependency-count';
        depDiv.innerHTML = `
            <i class="fas fa-arrow-up"></i> ${service.dependencyCount || 0}
            <i class="fas fa-arrow-down"></i> ${service.dependentCount || 0}
        `;
        depCell.appendChild(depDiv);

        // Actions cell
        const actionsCell = document.createElement('td');
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'service-actions';

        // Create action buttons securely
        if (service.Status === 'Running') {
            const stopBtn = createSecureButton(
                '<i class="fas fa-stop"></i>',
                () => controlServiceSecure(service.Name, 'stop'),
                'btn btn-warning btn-sm',
                'Stop Service'
            );
            actionsDiv.appendChild(stopBtn);
        } else {
            const startBtn = createSecureButton(
                '<i class="fas fa-play"></i>',
                () => controlServiceSecure(service.Name, 'start'),
                'btn btn-success btn-sm',
                'Start Service'
            );
            actionsDiv.appendChild(startBtn);
        }

        const restartBtn = createSecureButton(
            '<i class="fas fa-redo"></i>',
            () => controlServiceSecure(service.Name, 'restart'),
            'btn btn-info btn-sm',
            'Restart Service'
        );
        actionsDiv.appendChild(restartBtn);

        const detailsBtn = createSecureButton(
            '<i class="fas fa-info-circle"></i>',
            () => showServiceDetailsSecure(service.Name),
            'btn btn-info btn-sm',
            'Service Details'
        );
        actionsDiv.appendChild(detailsBtn);

        actionsCell.appendChild(actionsDiv);

        // Append all cells to row
        row.appendChild(nameCell);
        row.appendChild(displayCell);
        row.appendChild(statusCell);
        row.appendChild(startTypeCell);
        row.appendChild(depCell);
        row.appendChild(actionsCell);

        tableBody.appendChild(row);
    });
}

// Secure service control function
async function controlServiceSecure(serviceName, action) {
    try {
        // Validate inputs
        if (!validateServiceName(serviceName)) {
            throw new Error('Invalid service name provided');
        }

        if (!validateServiceAction(action)) {
            throw new Error('Invalid service action provided');
        }

        // Check for critical services
        if (isCriticalService(serviceName) && (action === 'stop' || action === 'restart')) {
            const confirmed = confirm(
                `WARNING: "${serviceName}" is a critical system service.\n\n` +
                `Stopping this service may cause system instability or prevent Windows from functioning properly.\n\n` +
                `Are you absolutely sure you want to ${action} this service?`
            );

            if (!confirmed) {
                return;
            }
        }

        const container = document.querySelector('[data-tab="folder-services"]') || document;
        const sanitizedServiceName = sanitizeServiceName(serviceName);

        showProgressModal(
            container,
            `${action.charAt(0).toUpperCase() + action.slice(1)}ing service...`,
            `Please wait while we ${action} the service "${sanitizedServiceName}"`
        );

        if (window && window.electronAPI) {
            const result = await window.electronAPI.controlService(sanitizedServiceName, action);
            console.log('Service control result:', result);

            hideModal(container, 'progress-modal');

            // Refresh services list
            await loadServices(container);

            // Show success message
            showNotification(`Service ${action} successful: ${result.message}`, 'success');

        } else {
            throw new Error('Desktop application required for service control');
        }

    } catch (error) {
        console.error(`Error ${action}ing service:`, error);
        const container = document.querySelector('[data-tab="folder-services"]') || document;
        hideModal(container, 'progress-modal');
        showError(container, `Failed to ${action} service: ${error.message}`);
    }
}

// Legacy function for backward compatibility (deprecated)
window.controlService = controlServiceSecure;

// Secure service details function
async function showServiceDetailsSecure(serviceName) {
    try {
        // Validate service name
        if (!validateServiceName(serviceName)) {
            throw new Error('Invalid service name provided');
        }

        const container = document.querySelector('[data-tab="folder-services"]') || document;
        const sanitizedServiceName = sanitizeServiceName(serviceName);

        showProgressModal(container, 'Loading service details...', `Getting detailed information for "${sanitizedServiceName}"`);

        if (window && window.electronAPI) {
            const details = await window.electronAPI.getServiceDetails(sanitizedServiceName);
            console.log('Service details received:', details);

            hideModal(container, 'progress-modal');
            displayServiceDetailsSecure(container, details);

        } else {
            throw new Error('Desktop application required for service details');
        }

    } catch (error) {
        console.error('Error getting service details:', error);
        const container = document.querySelector('[data-tab="folder-services"]') || document;
        hideModal(container, 'progress-modal');
        showError(container, 'Failed to get service details: ' + error.message);
    }
}

// Legacy function for backward compatibility (deprecated)
window.showServiceDetails = showServiceDetailsSecure;

function displayServiceDetailsSecure(container, details) {
    const modal = getElement(container, 'service-details-modal');
    const modalTitle = getElement(container, 'modal-service-name');
    const modalContent = getElement(container, 'service-details-content');

    if (!modal || !modalTitle || !modalContent) return;

    // Validate service details
    if (!details || !details.Name) {
        showError(container, 'Invalid service details received');
        return;
    }

    // Set modal title securely
    modalTitle.textContent = `${details.DisplayName || 'Unknown Service'} (${details.Name})`;

    // Clear existing content
    modalContent.innerHTML = '';

    // Create service detail grid securely using DOM methods
    const detailGrid = document.createElement('div');
    detailGrid.className = 'service-detail-grid';

    // Basic Information Card
    const basicCard = createDetailCard('Basic Information', [
        { label: 'Service Name', value: details.Name || 'Unknown' },
        { label: 'Display Name', value: details.DisplayName || 'Unknown' },
        { label: 'Status', value: details.Status || 'Unknown', isStatus: true },
        { label: 'Start Type', value: details.StartType || 'Unknown' },
        { label: 'Service Type', value: details.ServiceType || 'Unknown' }
    ]);
    detailGrid.appendChild(basicCard);

    // Capabilities Card
    const capabilitiesData = [
        { label: 'Can Stop', value: details.CanStop ? 'Yes' : 'No' },
        { label: 'Can Pause', value: details.CanPauseAndContinue ? 'Yes' : 'No' },
        { label: 'Can Shutdown', value: details.CanShutdown ? 'Yes' : 'No' }
    ];

    if (details.ProcessId) {
        capabilitiesData.push({ label: 'Process ID', value: details.ProcessId.toString() });
    }

    if (details.StartName) {
        capabilitiesData.push({ label: 'Start Name', value: details.StartName });
    }

    const capabilitiesCard = createDetailCard('Capabilities', capabilitiesData);
    detailGrid.appendChild(capabilitiesCard);

    modalContent.appendChild(detailGrid);

    // Description Card
    if (details.Description) {
        const descCard = createDetailCard('Description');
        const descPara = document.createElement('p');
        descPara.style.cssText = 'margin: 0; color: var(--text-primary); line-height: 1.5;';
        descPara.textContent = details.Description;
        descCard.appendChild(descPara);
        modalContent.appendChild(descCard);
    }

    // Executable Path Card
    if (details.PathName) {
        const pathCard = createDetailCard('Executable Path');
        const pathPara = document.createElement('p');
        pathPara.style.cssText = 'margin: 0; color: var(--text-primary); font-family: "Courier New", monospace; font-size: 12px; word-break: break-all;';
        pathPara.textContent = details.PathName;
        pathCard.appendChild(pathPara);
        modalContent.appendChild(pathCard);
    }

    // Dependencies Card
    if (details.ServicesDependedOn && details.ServicesDependedOn.length > 0) {
        const depsCard = createDetailCard(`Dependencies (${details.ServicesDependedOn.length})`);
        const depsList = document.createElement('div');
        depsList.className = 'dependency-list';

        details.ServicesDependedOn.forEach(dep => {
            const depItem = document.createElement('div');
            depItem.className = 'dependency-item';
            depItem.textContent = dep;
            depsList.appendChild(depItem);
        });

        depsCard.appendChild(depsList);
        modalContent.appendChild(depsCard);
    }

    // Dependent Services Card
    if (details.DependentServices && details.DependentServices.length > 0) {
        const dependentCard = createDetailCard(`Dependent Services (${details.DependentServices.length})`);
        const dependentList = document.createElement('div');
        dependentList.className = 'dependency-list';

        details.DependentServices.forEach(dep => {
            const depItem = document.createElement('div');
            depItem.className = 'dependency-item';
            depItem.textContent = dep;
            dependentList.appendChild(depItem);
        });

        dependentCard.appendChild(dependentList);
        modalContent.appendChild(dependentCard);
    }

    showModal(container, 'service-details-modal');
}

// Helper function to create detail cards securely
function createDetailCard(title, rows = []) {
    const card = document.createElement('div');
    card.className = 'detail-card';

    const cardTitle = document.createElement('h4');
    cardTitle.textContent = title;
    card.appendChild(cardTitle);

    rows.forEach(row => {
        const detailRow = document.createElement('div');
        detailRow.className = 'detail-row';

        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = row.label + ':';

        const value = document.createElement('span');
        value.className = 'value';

        if (row.isStatus) {
            const statusSpan = document.createElement('span');
            statusSpan.className = `service-status status-${(row.value || '').toString().toLowerCase()}`;
            statusSpan.textContent = row.value;
            value.appendChild(statusSpan);
        } else {
            value.textContent = row.value;
        }

        detailRow.appendChild(label);
        detailRow.appendChild(value);
        card.appendChild(detailRow);
    });

    return card;
}

// Legacy function for backward compatibility (deprecated)
function displayServiceDetails(container, details) {
    displayServiceDetailsSecure(container, details);
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

// Notification system for better user feedback
function showNotification(message, type = 'info', duration = 5000) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.service-notification');
    existingNotifications.forEach(notification => notification.remove());

    const notification = document.createElement('div');
    notification.className = `service-notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 400px;
        word-wrap: break-word;
        animation: slideInRight 0.3s ease-out;
    `;

    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle';
    notification.innerHTML = `<i class="fas fa-${icon}"></i> ${escapeHtml(message)}`;

    document.body.appendChild(notification);

    // Auto-remove after duration
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }
    }, duration);
}

// Add CSS animations for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(notificationStyles);

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

    // Clear existing content
    currentContainer.innerHTML = '';

    if (quickAccessServices.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <i class="fas fa-inbox"></i>
            <p>No services in quick access</p>
        `;
        currentContainer.appendChild(emptyState);
        return;
    }

    // Create service items securely using DOM methods
    quickAccessServices.forEach(service => {
        if (!validateServiceName(service.Name)) {
            console.warn('Invalid service name detected:', service.Name);
            return;
        }

        const item = document.createElement('div');
        item.className = 'current-service-item';

        const info = document.createElement('div');
        info.className = 'current-service-info';

        const name = document.createElement('div');
        name.className = 'current-service-name';
        name.textContent = service.Name || 'Unknown';

        const display = document.createElement('div');
        display.className = 'current-service-display';
        display.textContent = service.DisplayName || 'Unknown Service';

        info.appendChild(name);
        info.appendChild(display);

        const removeBtn = createSecureButton(
            '<i class="fas fa-times"></i> Remove',
            () => removeFromQuickAccessSecure(service.Name),
            'remove-service-btn',
            'Remove from Quick Access'
        );

        item.appendChild(info);
        item.appendChild(removeBtn);
        currentContainer.appendChild(item);
    });
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

    // Clear existing content
    availableContainer.innerHTML = '';

    if (filteredAvailable.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <i class="fas fa-search"></i>
            <p>${modalSearchFilter ? 'No services found matching your search' : 'All services are already in quick access'}</p>
        `;
        availableContainer.appendChild(emptyState);
        return;
    }

    // Create service items securely using DOM methods
    filteredAvailable.forEach(service => {
        if (!validateServiceName(service.Name)) {
            console.warn('Invalid service name detected:', service.Name);
            return;
        }

        const item = document.createElement('div');
        item.className = 'available-service-item';

        const info = document.createElement('div');
        info.className = 'available-service-info';

        const name = document.createElement('div');
        name.className = 'available-service-name';
        name.textContent = service.Name || 'Unknown';

        const display = document.createElement('div');
        display.className = 'available-service-display';
        display.textContent = service.DisplayName || 'Unknown Service';

        info.appendChild(name);
        info.appendChild(display);

        const addBtn = createSecureButton(
            '<i class="fas fa-plus"></i> Add',
            () => addToQuickAccessSecure(service.Name),
            'add-service-btn',
            'Add to Quick Access'
        );

        item.appendChild(info);
        item.appendChild(addBtn);
        availableContainer.appendChild(item);
    });
}

// Secure quick access management functions
function removeFromQuickAccessSecure(serviceName) {
    if (!validateServiceName(serviceName)) {
        console.error('Invalid service name for removal:', serviceName);
        return;
    }

    const sanitizedServiceName = sanitizeServiceName(serviceName);
    quickAccessServices = quickAccessServices.filter(service => service.Name !== sanitizedServiceName);

    // Add back to available services
    const serviceToAdd = allServices.find(service => service.Name === sanitizedServiceName);
    if (serviceToAdd) {
        availableServicesForModal.push(serviceToAdd);
    }

    const container = document.querySelector('[data-tab="folder-services"]') || document;
    renderCurrentServices(container);
    renderAvailableServices(container);
}

function addToQuickAccessSecure(serviceName) {
    if (!validateServiceName(serviceName)) {
        console.error('Invalid service name for addition:', serviceName);
        return;
    }

    const sanitizedServiceName = sanitizeServiceName(serviceName);
    const serviceToAdd = allServices.find(service => service.Name === sanitizedServiceName);

    if (serviceToAdd) {
        quickAccessServices.push(serviceToAdd);

        // Remove from available services
        availableServicesForModal = availableServicesForModal.filter(service => service.Name !== sanitizedServiceName);

        const container = document.querySelector('[data-tab="folder-services"]') || document;
        renderCurrentServices(container);
        renderAvailableServices(container);
    }
}

// Legacy functions for backward compatibility (deprecated)
window.removeFromQuickAccess = removeFromQuickAccessSecure;
window.addToQuickAccess = addToQuickAccessSecure;

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
