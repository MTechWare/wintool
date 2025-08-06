/**
 * Services Manager - High-Performance Implementation
 * Optimized for speed using WMIC with PowerShell and sc.exe fallbacks
 *
 * Performance Optimizations:
 * - Uses WMIC for ultra-fast service enumeration (10x faster than sc.exe)
 * - Single-call data retrieval (no individual service queries)
 * - Intelligent fallback chain: WMIC → PowerShell → sc.exe
 * - Eliminates the slow enhanceServiceData() bottleneck
 *
 * Enhanced with automatic service enabling and privilege escalation:
 * - Automatically detects when a service is disabled before starting
 * - Attempts to enable disabled services using elevated privileges
 * - Provides clear feedback when services are automatically enabled
 * - Handles the common "Spooler service disabled" scenario gracefully
 * - Multi-tier privilege escalation for start/stop operations:
 *   1. Try standard net.exe commands
 *   2. Fallback to sc.exe commands
 *   3. Final fallback to elevated PowerShell commands
 * - Comprehensive error handling with detailed failure information
 */

let allServices = [];
let filteredServices = [];
let currentFilter = { status: 'all', type: 'all', search: '' };
let quickAccessServices = [];
let availableServicesForModal = [];
let modalSearchFilter = '';
let isLoading = false;

const SECURITY_CONFIG = {
    allowedServiceActions: ['start', 'stop', 'restart'],
    serviceNameMaxLength: 100,
    serviceNamePattern: /^[a-zA-Z0-9_.-]+$/,
    criticalServices: [
        'winlogon', 'csrss', 'wininit', 'services', 'lsass', 'svchost',
        'explorer', 'dwm', 'audiodg', 'conhost', 'smss',
    ],
};

// Default common services for quick access - reduced to most essential services
const defaultCommonServiceNames = [
    'wuauserv',        // Windows Update
    'spooler',         // Print Spooler
    'AudioSrv',        // Windows Audio
    'Themes',          // Themes
    'Schedule',        // Task Scheduler
    'WinDefend',       // Windows Defender Antivirus Service
    'MpsSvc',          // Windows Firewall
    'Dnscache'         // DNS Client
];

// Configuration for hiding PowerShell script execution details
const HIDE_POWERSHELL_SCRIPTS = true;
const SILENT_MODE = true;

// Native Windows service management using sc.exe and net.exe only
const ServiceManager = {
    /**
     * Get all Windows services using optimized WMIC method (much faster)
     */
    async getAllServices() {
        try {
            if (!SILENT_MODE) {
                console.log('Getting services using optimized WMIC method...');
            }

            if (!window.electronAPI?.executeCmdCommand) {
                throw new Error('Electron API not available - desktop application required');
            }

            // Use WMIC for fast service retrieval (similar to simple-command-executor.js)
            return await this.getServicesWithWMIC();
        } catch (error) {
            if (!SILENT_MODE) {
                console.error('Failed to get services with WMIC, trying fallback methods:', error);
            }
            // Fallback to PowerShell method
            try {
                return await this.getServicesWithPowerShell();
            } catch (psError) {
                if (!SILENT_MODE) {
                    console.error('PowerShell method also failed, using sc.exe fallback:', psError);
                }
                // Final fallback to sc.exe (original slow method)
                const result = await window.electronAPI.executeCmdCommand('sc query state= all');
                return this.parseScQueryOutput(result);
            }
        }
    },

    /**
     * Get services using WMIC (fastest method)
     */
    async getServicesWithWMIC() {
        try {
            const wmicCommand = 'wmic service get Name,DisplayName,State,StartMode /format:csv';
            const result = await window.electronAPI.executeCmdCommand(wmicCommand);

            // Parse CSV output - WMIC CSV format is: Node,DisplayName,Name,StartMode,State
            const lines = result
                .split('\n')
                .filter(line => line.trim() && !line.startsWith('Node'));
            const services = [];

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const parts = line.split(',');
                if (parts.length >= 5) {
                    const service = {
                        Name: (parts[2] || '').trim(),
                        DisplayName: (parts[1] || '').trim(),
                        Status: this.convertWMICStatus((parts[4] || '').trim()),
                        StartType: this.convertWMICStartType((parts[3] || '').trim()),
                        isCommonService: this.isCommonService((parts[2] || '').trim())
                    };

                    // Only add services with valid names
                    if (service.Name) {
                        services.push(service);
                    }
                }
            }

            if (!SILENT_MODE) {
                console.log(`WMIC method loaded ${services.length} services successfully`);
            }
            return services;
        } catch (error) {
            throw new Error(`WMIC method failed: ${error.message}`);
        }
    },

    /**
     * Get services using PowerShell (fallback method)
     */
    async getServicesWithPowerShell() {
        try {
            // Use a simple PowerShell command that gets all needed data in one call
            const psScript = `Get-Service | Select-Object Name,DisplayName,Status,StartType | ConvertTo-Json`;

            // Hide PowerShell command execution if configured
            let command;
            if (HIDE_POWERSHELL_SCRIPTS) {
                // Use silent execution parameters
                command = `powershell -WindowStyle Hidden -NoProfile -NonInteractive -Command "${psScript}"`;
            } else {
                command = `powershell -Command "${psScript}"`;
            }

            const output = await window.electronAPI.executeCmdCommand(command);

            if (!output || output.trim().length === 0) {
                throw new Error('PowerShell method returned no data');
            }

            const services = JSON.parse(output);
            const servicesArray = Array.isArray(services) ? services : [services];

            // Convert and enhance the service data
            const enhancedServices = servicesArray.map(service => ({
                Name: service.Name,
                DisplayName: service.DisplayName,
                Status: this.convertPSStatus(service.Status),
                StartType: this.convertPSStartType(service.StartType),
                isCommonService: this.isCommonService(service.Name)
            }));

            if (!SILENT_MODE) {
                console.log(`PowerShell method loaded ${enhancedServices.length} services successfully`);
            }
            return enhancedServices;
        } catch (error) {
            throw new Error(`PowerShell method failed: ${error.message}`);
        }
    },

    /**
     * Convert WMIC status to standard format
     */
    convertWMICStatus(status) {
        const statusMap = {
            'Running': 'Running',
            'Stopped': 'Stopped',
            'Paused': 'Paused',
            'Start Pending': 'Starting',
            'Stop Pending': 'Stopping',
            'Continue Pending': 'Starting',
            'Pause Pending': 'Pausing'
        };
        return statusMap[status] || status || 'Unknown';
    },

    /**
     * Convert WMIC start type to standard format
     */
    convertWMICStartType(startType) {
        const startTypeMap = {
            'Auto': 'Automatic',
            'Manual': 'Manual',
            'Disabled': 'Disabled',
            'Boot': 'Boot',
            'System': 'System'
        };
        return startTypeMap[startType] || startType || 'Unknown';
    },

    /**
     * Convert PowerShell status to standard format
     */
    convertPSStatus(status) {
        const statusMap = {
            1: 'Stopped',
            2: 'Starting',
            3: 'Stopping',
            4: 'Running',
            5: 'Starting',
            6: 'Pausing',
            7: 'Paused'
        };
        return statusMap[status] || status?.toString() || 'Unknown';
    },

    /**
     * Convert PowerShell start type to standard format
     */
    convertPSStartType(startType) {
        const startTypeMap = {
            0: 'Boot',
            1: 'System',
            2: 'Automatic',
            3: 'Manual',
            4: 'Disabled'
        };
        return startTypeMap[startType] || startType?.toString() || 'Unknown';
    },

    /**
     * Parse sc query output into service objects (legacy fallback method)
     */
    parseScQueryOutput(output) {
        const services = [];
        const lines = output.split('\n');
        let currentService = null;

        for (let line of lines) {
            line = line.trim();
            
            if (line.startsWith('SERVICE_NAME:')) {
                // Save previous service if exists
                if (currentService && currentService.Name) {
                    services.push(currentService);
                }
                
                // Start new service
                currentService = {
                    Name: line.replace('SERVICE_NAME:', '').trim(),
                    DisplayName: '',
                    Status: 'Unknown',
                    StartType: 'Unknown',
                    isCommonService: false
                };
            } else if (line.startsWith('DISPLAY_NAME:') && currentService) {
                currentService.DisplayName = line.replace('DISPLAY_NAME:', '').trim();
            } else if (line.includes('STATE') && currentService) {
                // Parse state line: "STATE              : 4  RUNNING"
                const stateParts = line.split(':');
                if (stateParts.length > 1) {
                    const stateInfo = stateParts[1].trim();
                    if (stateInfo.includes('RUNNING')) {
                        currentService.Status = 'Running';
                    } else if (stateInfo.includes('STOPPED')) {
                        currentService.Status = 'Stopped';
                    } else if (stateInfo.includes('PAUSED')) {
                        currentService.Status = 'Paused';
                    } else if (stateInfo.includes('START_PENDING')) {
                        currentService.Status = 'Starting';
                    } else if (stateInfo.includes('STOP_PENDING')) {
                        currentService.Status = 'Stopping';
                    }
                }
            }
        }

        // Add the last service
        if (currentService && currentService.Name) {
            services.push(currentService);
        }

        // Mark common services (start types are now retrieved in the main query)
        return services.map(service => ({
            ...service,
            isCommonService: this.isCommonService(service.Name)
        }));
    },

    /**
     * Parse start type from sc qc output
     */
    parseStartType(output) {
        const lines = output.split('\n');
        for (let line of lines) {
            if (line.includes('START_TYPE')) {
                if (line.includes('AUTO_START')) return 'Automatic';
                if (line.includes('DEMAND_START')) return 'Manual';
                if (line.includes('DISABLED')) return 'Disabled';
                if (line.includes('DELAYED_AUTO_START')) return 'Automatic (Delayed)';
            }
        }
        return 'Unknown';
    },

    /**
     * Check if service is a common service
     */
    isCommonService(serviceName) {
        return defaultCommonServiceNames.includes(serviceName);
    },

    /**
     * Check if a service is disabled
     */
    async isServiceDisabled(serviceName) {
        try {
            const sanitizedName = this.sanitizeServiceName(serviceName);
            const configResult = await window.electronAPI.executeCmdCommand(`sc qc "${sanitizedName}"`);
            const startType = this.parseStartType(configResult);
            return startType === 'Disabled';
        } catch (error) {
            if (!SILENT_MODE) {
                console.warn(`Could not check if service "${serviceName}" is disabled: ${error.message}`);
            }
            return false;
        }
    },

    /**
     * Check if an error indicates access/privilege issues
     */
    isPrivilegeError(error) {
        if (!error || !error.message) return false;
        const message = error.message.toLowerCase();
        return message.includes('access is denied') ||
               message.includes('access denied') ||
               message.includes('insufficient privilege') ||
               message.includes('privilege not held') ||
               message.includes('operation requires elevation');
    },

    /**
     * Enable a disabled service
     */
    async enableService(serviceName) {
        const sanitizedName = this.sanitizeServiceName(serviceName);

        try {
            // Try to enable the service using elevated PowerShell
            let enableCommand;
            if (HIDE_POWERSHELL_SCRIPTS) {
                enableCommand = `powershell -WindowStyle Hidden -Command "Start-Process powershell -WindowStyle Hidden -Verb RunAs -ArgumentList '-WindowStyle', 'Hidden', '-Command', 'Set-Service -Name ''${sanitizedName}'' -StartupType Automatic' -Wait"`;
            } else {
                enableCommand = `powershell -Command "Start-Process powershell -Verb RunAs -ArgumentList '-Command', 'Set-Service -Name ''${sanitizedName}'' -StartupType Automatic' -Wait"`;
            }
            await window.electronAPI.executeCmdCommand(enableCommand);
            return { success: true, message: `Service "${sanitizedName}" enabled successfully` };
        } catch (enableError) {
            // Check if it's an access denied error
            if (enableError.message && enableError.message.toLowerCase().includes('access is denied')) {
                throw new Error(`Access denied: Administrator privileges required to enable service "${sanitizedName}". Please run the application as administrator or manually enable the service in Services.msc.`);
            }

            // Fallback: try sc config with elevated privileges
            try {
                let scConfigCommand;
                if (HIDE_POWERSHELL_SCRIPTS) {
                    scConfigCommand = `powershell -WindowStyle Hidden -Command "Start-Process powershell -WindowStyle Hidden -Verb RunAs -ArgumentList '-WindowStyle', 'Hidden', '-Command', 'sc config ''${sanitizedName}'' start= auto' -Wait"`;
                } else {
                    scConfigCommand = `powershell -Command "Start-Process powershell -Verb RunAs -ArgumentList '-Command', 'sc config ''${sanitizedName}'' start= auto' -Wait"`;
                }
                await window.electronAPI.executeCmdCommand(scConfigCommand);
                return { success: true, message: `Service "${sanitizedName}" enabled via sc config` };
            } catch (scError) {
                // Check for access denied in fallback as well
                if (scError.message && scError.message.toLowerCase().includes('access is denied')) {
                    throw new Error(`Access denied: Administrator privileges required to enable service "${sanitizedName}". Please run the application as administrator or manually enable the service in Services.msc.`);
                }

                throw new Error(`Service could not be enabled. Please run as administrator or enable the service manually. To enable manually: Open Services.msc → Find "${sanitizedName}" → Properties → Set Startup type to "Automatic" → Apply → Start. Errors: ${enableError.message}, ${scError.message}`);
            }
        }
    },

    /**
     * Control service using sc.exe and net.exe (no PowerShell)
     */
    async controlService(serviceName, action) {
        if (!this.validateServiceName(serviceName) || !this.validateServiceAction(action)) {
            throw new Error('Invalid service name or action');
        }

        const sanitizedName = this.sanitizeServiceName(serviceName);

        try {
            let command;
            let successMessage;
            let wasEnabled = false;

            switch (action) {
                case 'start':
                    // Check if service is disabled before attempting to start
                    const isDisabled = await this.isServiceDisabled(sanitizedName);
                    if (isDisabled) {
                        if (!SILENT_MODE) {
                            console.log(`Service "${sanitizedName}" is disabled. Enabling it first...`);
                        }
                        const enableResult = await this.enableService(sanitizedName);
                        if (!SILENT_MODE) {
                            console.log(enableResult.message);
                        }
                        wasEnabled = true;
                        // Wait a moment for the configuration change to take effect
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }

                    // Try net start first (more reliable), fallback to sc start, then elevated start
                    try {
                        command = `net start "${sanitizedName}"`;
                        await window.electronAPI.executeCmdCommand(command);
                        successMessage = `Service "${sanitizedName}" started successfully`;
                    } catch (netError) {
                        try {
                            command = `sc start "${sanitizedName}"`;
                            await window.electronAPI.executeCmdCommand(command);
                            successMessage = `Service "${sanitizedName}" started successfully`;
                        } catch (scError) {
                            // If both fail, try with elevated privileges
                            if (!SILENT_MODE) {
                                console.log(`Standard start methods failed for "${sanitizedName}". Trying with elevated privileges...`);
                            }
                            try {
                                let elevatedCommand;
                                if (HIDE_POWERSHELL_SCRIPTS) {
                                    elevatedCommand = `powershell -WindowStyle Hidden -Command "Start-Process powershell -WindowStyle Hidden -Verb RunAs -ArgumentList '-WindowStyle', 'Hidden', '-Command', 'Start-Service -Name ''${sanitizedName}''' -Wait"`;
                                } else {
                                    elevatedCommand = `powershell -Command "Start-Process powershell -Verb RunAs -ArgumentList '-Command', 'Start-Service -Name ''${sanitizedName}''' -Wait"`;
                                }
                                await window.electronAPI.executeCmdCommand(elevatedCommand);
                                successMessage = `Service "${sanitizedName}" started successfully (elevated privileges required)`;
                            } catch (elevatedError) {
                                // If all methods fail, provide comprehensive error message
                                throw new Error(`Failed to start service with all methods. Net error: ${netError.message}. SC error: ${scError.message}. Elevated error: ${elevatedError.message}`);
                            }
                        }
                    }
                    break;

                case 'stop':
                    // Try net stop first, fallback to sc stop, then elevated stop
                    try {
                        command = `net stop "${sanitizedName}" /y`;
                        await window.electronAPI.executeCmdCommand(command);
                        successMessage = `Service "${sanitizedName}" stopped successfully`;
                    } catch (netError) {
                        try {
                            command = `sc stop "${sanitizedName}"`;
                            await window.electronAPI.executeCmdCommand(command);
                            successMessage = `Service "${sanitizedName}" stopped successfully`;
                        } catch (scError) {
                            // If both fail, try with elevated privileges
                            if (!SILENT_MODE) {
                                console.log(`Standard stop methods failed for "${sanitizedName}". Trying with elevated privileges...`);
                            }
                            try {
                                let elevatedCommand;
                                if (HIDE_POWERSHELL_SCRIPTS) {
                                    elevatedCommand = `powershell -WindowStyle Hidden -Command "Start-Process powershell -WindowStyle Hidden -Verb RunAs -ArgumentList '-WindowStyle', 'Hidden', '-Command', 'Stop-Service -Name ''${sanitizedName}'' -Force' -Wait"`;
                                } else {
                                    elevatedCommand = `powershell -Command "Start-Process powershell -Verb RunAs -ArgumentList '-Command', 'Stop-Service -Name ''${sanitizedName}'' -Force' -Wait"`;
                                }
                                await window.electronAPI.executeCmdCommand(elevatedCommand);
                                successMessage = `Service "${sanitizedName}" stopped successfully (elevated privileges required)`;
                            } catch (elevatedError) {
                                // If all methods fail, provide comprehensive error message
                                throw new Error(`Failed to stop service with all methods. Net error: ${netError.message}. SC error: ${scError.message}. Elevated error: ${elevatedError.message}`);
                            }
                        }
                    }
                    break;

                case 'restart':
                    // Stop then start
                    await this.controlService(serviceName, 'stop');
                    // Wait a moment before starting
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await this.controlService(serviceName, 'start');
                    successMessage = `Service "${sanitizedName}" restarted successfully`;
                    break;

                default:
                    throw new Error(`Invalid action: ${action}`);
            }

            return {
                success: true,
                message: successMessage,
                serviceName: serviceName,
                action: action,
                wasEnabled: wasEnabled
            };
        } catch (error) {
            throw new Error(`Failed to ${action} service "${serviceName}": ${error.message}`);
        }
    },

    /**
     * Get detailed service information using sc qc and sc query (no PowerShell)
     */
    async getServiceDetails(serviceName) {
        if (!this.validateServiceName(serviceName)) {
            throw new Error('Invalid service name');
        }

        const sanitizedName = this.sanitizeServiceName(serviceName);
        
        try {
            // Get service configuration
            const configResult = await window.electronAPI.executeCmdCommand(`sc qc "${sanitizedName}"`);
            const queryResult = await window.electronAPI.executeCmdCommand(`sc query "${sanitizedName}"`);
            
            return this.parseServiceDetails(configResult, queryResult, sanitizedName);
        } catch (error) {
            throw new Error(`Failed to get service details: ${error.message}`);
        }
    },

    /**
     * Parse detailed service information from sc output
     */
    parseServiceDetails(configOutput, queryOutput, serviceName) {
        const details = {
            Name: serviceName,
            DisplayName: '',
            Status: 'Unknown',
            StartType: 'Unknown',
            ServiceType: 'Unknown',
            Description: '',
            PathName: '',
            CanStop: false,
            CanPauseAndContinue: false,
            CanShutdown: false
        };

        // Parse config output
        const configLines = configOutput.split('\n');
        for (let line of configLines) {
            line = line.trim();
            if (line.includes('DISPLAY_NAME')) {
                details.DisplayName = line.split(':')[1]?.trim() || serviceName;
            } else if (line.includes('BINARY_PATH_NAME')) {
                details.PathName = line.split(':')[1]?.trim() || '';
            } else if (line.includes('START_TYPE')) {
                details.StartType = this.parseStartType(configOutput);
            } else if (line.includes('SERVICE_TYPE')) {
                details.ServiceType = line.split(':')[1]?.trim() || 'Unknown';
            }
        }

        // Parse query output for status and capabilities
        const queryLines = queryOutput.split('\n');
        for (let line of queryLines) {
            line = line.trim();
            if (line.includes('STATE')) {
                const stateParts = line.split(':');
                if (stateParts.length > 1) {
                    const stateInfo = stateParts[1].trim();
                    if (stateInfo.includes('RUNNING')) {
                        details.Status = 'Running';
                        details.CanStop = true;
                    } else if (stateInfo.includes('STOPPED')) {
                        details.Status = 'Stopped';
                    } else if (stateInfo.includes('PAUSED')) {
                        details.Status = 'Paused';
                        details.CanPauseAndContinue = true;
                    }
                }
            }
        }

        return details;
    },

    // Validation methods
    validateServiceName(serviceName) {
        if (!serviceName || typeof serviceName !== 'string') return false;
        if (serviceName.length > SECURITY_CONFIG.serviceNameMaxLength) return false;
        return SECURITY_CONFIG.serviceNamePattern.test(serviceName);
    },

    validateServiceAction(action) {
        return SECURITY_CONFIG.allowedServiceActions.includes(action);
    },

    isCriticalService(serviceName) {
        return SECURITY_CONFIG.criticalServices.includes(serviceName.toLowerCase());
    },

    sanitizeServiceName(serviceName) {
        if (!serviceName) return '';
        return serviceName.replace(/[^a-zA-Z0-9_.-]/g, '');
    }
};

// Legacy validation functions for backward compatibility
function validateServiceName(serviceName) {
    return ServiceManager.validateServiceName(serviceName);
}

function validateServiceAction(action) {
    return ServiceManager.validateServiceAction(action);
}

function isCriticalService(serviceName) {
    return ServiceManager.isCriticalService(serviceName);
}

function sanitizeServiceName(serviceName) {
    return ServiceManager.sanitizeServiceName(serviceName);
}

// Utility functions
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

function getElement(container, id) {
    return container.querySelector(`#${id}`) || document.querySelector(`#${id}`);
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
    if (!SILENT_MODE) {
        console.error('Services Manager Error:', message);
    }
    if (window.electronAPI?.logError) {
        window.electronAPI.logError(`Services Manager Error: ${message}`, 'ServicesTab');
    }
    showNotification(message, 'error');
}

function showModal(container, modalId) {
    const modal = getElement(container, modalId);
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function hideModal(container, modalId) {
    const modal = getElement(container, modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }
}

// Customize modal functionality
function showCustomizeModal(container) {
    try {
        // Populate current services
        populateCurrentServices(container);

        // Populate available services
        populateAvailableServices(container);

        // Setup modal search
        setupModalSearch(container);

        // Setup modal buttons
        setupCustomizeModalButtons(container);

        // Show the modal
        showModal(container, 'customize-modal');
    } catch (error) {
        if (!SILENT_MODE) {
            console.error('Error showing customize modal:', error);
        }
        showError(container, 'Failed to open customize modal: ' + error.message);
    }
}

function populateCurrentServices(container) {
    const currentServicesContainer = getElement(container, 'current-services');
    if (!currentServicesContainer) return;

    currentServicesContainer.innerHTML = '';

    if (quickAccessServices.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = '<p>No services in quick access</p>';
        currentServicesContainer.appendChild(emptyState);
        return;
    }

    quickAccessServices.forEach(service => {
        const serviceItem = document.createElement('div');
        serviceItem.className = 'current-service-item';

        const serviceInfo = document.createElement('div');
        serviceInfo.className = 'service-info';

        const serviceName = document.createElement('span');
        serviceName.className = 'service-name';
        serviceName.textContent = service.DisplayName || service.Name;

        const serviceStatus = document.createElement('span');
        serviceStatus.className = `service-status status-${service.Status?.toLowerCase() || 'unknown'}`;
        serviceStatus.textContent = service.Status || 'Unknown';

        serviceInfo.appendChild(serviceName);
        serviceInfo.appendChild(serviceStatus);

        const removeBtn = createSecureButton(
            '<i class="fas fa-times"></i>',
            () => removeFromQuickAccess(container, service.Name),
            'btn btn-danger btn-sm',
            'Remove from Quick Access'
        );

        serviceItem.appendChild(serviceInfo);
        serviceItem.appendChild(removeBtn);
        currentServicesContainer.appendChild(serviceItem);
    });
}

function populateAvailableServices(container) {
    const availableServicesContainer = getElement(container, 'available-services');
    if (!availableServicesContainer) return;

    // Get services not in quick access
    const quickAccessNames = quickAccessServices.map(s => s.Name);
    availableServicesForModal = allServices.filter(service =>
        !quickAccessNames.includes(service.Name)
    );

    renderAvailableServices(container);
}

function renderAvailableServices(container) {
    const availableServicesContainer = getElement(container, 'available-services');
    if (!availableServicesContainer) return;

    availableServicesContainer.innerHTML = '';

    // Filter services based on search
    let filteredServices = availableServicesForModal;
    if (modalSearchFilter) {
        filteredServices = availableServicesForModal.filter(service =>
            service.Name.toLowerCase().includes(modalSearchFilter) ||
            (service.DisplayName && service.DisplayName.toLowerCase().includes(modalSearchFilter))
        );
    }

    if (filteredServices.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = '<p>No services found</p>';
        availableServicesContainer.appendChild(emptyState);
        return;
    }

    // Limit to first 50 services for performance
    const servicesToShow = filteredServices.slice(0, 50);

    servicesToShow.forEach(service => {
        const serviceItem = document.createElement('div');
        serviceItem.className = 'available-service-item';

        const serviceInfo = document.createElement('div');
        serviceInfo.className = 'service-info';

        const serviceName = document.createElement('span');
        serviceName.className = 'service-name';
        serviceName.textContent = service.DisplayName || service.Name;

        const serviceStatus = document.createElement('span');
        serviceStatus.className = `service-status status-${service.Status?.toLowerCase() || 'unknown'}`;
        serviceStatus.textContent = service.Status || 'Unknown';

        serviceInfo.appendChild(serviceName);
        serviceInfo.appendChild(serviceStatus);

        const addBtn = createSecureButton(
            '<i class="fas fa-plus"></i>',
            () => addToQuickAccess(container, service.Name),
            'btn btn-success btn-sm',
            'Add to Quick Access'
        );

        serviceItem.appendChild(serviceInfo);
        serviceItem.appendChild(addBtn);
        availableServicesContainer.appendChild(serviceItem);
    });

    if (filteredServices.length > 50) {
        const moreInfo = document.createElement('div');
        moreInfo.className = 'more-services-info';
        moreInfo.textContent = `Showing first 50 of ${filteredServices.length} services. Use search to narrow results.`;
        availableServicesContainer.appendChild(moreInfo);
    }
}

function setupModalSearch(container) {
    const searchInput = getElement(container, 'service-search-modal');
    if (searchInput) {
        // Clear any existing value and reset filter
        searchInput.value = '';
        modalSearchFilter = '';

        // Add new event listener
        searchInput.addEventListener('input', (e) => {
            modalSearchFilter = e.target.value.toLowerCase();
            renderAvailableServices(container);
        });
    }
}



function setupCustomizeModalButtons(container) {
    // Reset defaults button
    const resetBtn = getElement(container, 'reset-defaults');
    if (resetBtn) {
        // Remove any existing event listeners by cloning the element
        const newResetBtn = resetBtn.cloneNode(true);
        resetBtn.parentNode.replaceChild(newResetBtn, resetBtn);
        newResetBtn.addEventListener('click', () => handleResetDefaults(container));
    }

    // Save changes button
    const saveBtn = getElement(container, 'save-quick-access');
    if (saveBtn) {
        // Remove any existing event listeners by cloning the element
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        newSaveBtn.addEventListener('click', () => handleSaveQuickAccess(container));
    }
}

function addToQuickAccess(container, serviceName) {
    try {
        const service = allServices.find(s => s.Name === serviceName);
        if (!service) {
            showError(container, 'Service not found');
            return;
        }

        // Check if already in quick access
        if (quickAccessServices.find(s => s.Name === serviceName)) {
            showNotification('Service is already in quick access', 'warning');
            return;
        }

        // Add to quick access
        quickAccessServices.push(service);

        // Refresh both lists
        populateCurrentServices(container);
        populateAvailableServices(container);

        showNotification(`Added ${service.DisplayName || service.Name} to quick access`, 'success');
    } catch (error) {
        if (!SILENT_MODE) {
            console.error('Error adding service to quick access:', error);
        }
        showError(container, 'Failed to add service to quick access');
    }
}

function removeFromQuickAccess(container, serviceName) {
    try {
        const index = quickAccessServices.findIndex(s => s.Name === serviceName);
        if (index === -1) {
            showError(container, 'Service not found in quick access');
            return;
        }

        const service = quickAccessServices[index];
        quickAccessServices.splice(index, 1);

        // Refresh both lists
        populateCurrentServices(container);
        populateAvailableServices(container);

        showNotification(`Removed ${service.DisplayName || service.Name} from quick access`, 'success');
    } catch (error) {
        if (!SILENT_MODE) {
            console.error('Error removing service from quick access:', error);
        }
        showError(container, 'Failed to remove service from quick access');
    }
}

function handleResetDefaults(container) {
    try {
        if (!confirm('Reset quick access services to default list? This will remove all custom services.')) {
            return;
        }

        // Reset to default services
        quickAccessServices = allServices.filter(service =>
            defaultCommonServiceNames.includes(service.Name)
        );

        // Refresh both lists
        populateCurrentServices(container);
        populateAvailableServices(container);

        showNotification('Quick access services reset to defaults', 'success');
    } catch (error) {
        if (!SILENT_MODE) {
            console.error('Error resetting to defaults:', error);
        }
        showError(container, 'Failed to reset to defaults');
    }
}

async function handleSaveQuickAccess(container) {
    try {
        // Save the current quick access services
        const serviceNames = quickAccessServices.map(s => s.Name);

        if (window.electronAPI?.setSetting) {
            await window.electronAPI.setSetting('quickAccessServices', serviceNames);
        }

        // Refresh the quick access display in the main view
        renderQuickAccessServices(container);

        // Close the modal
        hideModal(container, 'customize-modal');

        showNotification('Quick access services saved successfully', 'success');
    } catch (error) {
        if (!SILENT_MODE) {
            console.error('Error saving quick access services:', error);
        }
        showError(container, 'Failed to save quick access services: ' + error.message);
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

// Enhanced notification system
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

    const icon = type === 'success' ? 'check-circle' :
                 type === 'error' ? 'exclamation-triangle' : 'info-circle';
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
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(notificationStyles);

// Main service control functions using native Windows commands
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

        // Use our new ServiceManager
        const result = await ServiceManager.controlService(sanitizedServiceName, action);

        hideModal(container, 'progress-modal');

        // Refresh services list
        await loadServices(container);

        // Show success message with additional context for enabled services
        let successMessage = `Service ${action} successful: ${result.message}`;
        if (action === 'start' && result.wasEnabled) {
            successMessage += ' (Service was automatically enabled)';
        }
        showNotification(successMessage, 'success');
    } catch (error) {
        if (!SILENT_MODE) {
            console.error(`Error ${action}ing service:`, error);
        }
        const container = document.querySelector('[data-tab="folder-services"]') || document;
        hideModal(container, 'progress-modal');
        showError(container, `Failed to ${action} service: ${error.message}`);
    }
}

async function showServiceDetailsSecure(serviceName) {
    try {
        // Validate service name
        if (!validateServiceName(serviceName)) {
            throw new Error('Invalid service name provided');
        }

        const container = document.querySelector('[data-tab="folder-services"]') || document;
        const sanitizedServiceName = sanitizeServiceName(serviceName);

        showProgressModal(
            container,
            'Loading service details...',
            `Getting detailed information for "${sanitizedServiceName}"`
        );

        // Use our new ServiceManager
        const details = await ServiceManager.getServiceDetails(sanitizedServiceName);

        hideModal(container, 'progress-modal');
        displayServiceDetailsSecure(container, details);
    } catch (error) {
        if (!SILENT_MODE) {
            console.error('Error getting service details:', error);
        }
        const container = document.querySelector('[data-tab="folder-services"]') || document;
        hideModal(container, 'progress-modal');
        showError(container, 'Failed to get service details: ' + error.message);
    }
}

// Main service loading function using optimized methods
async function loadServices(container) {
    if (isLoading) {
        if (!SILENT_MODE) {
            console.log('Services already loading, skipping...');
        }
        return;
    }

    try {
        isLoading = true;
        showLoading(container, true);

        if (!SILENT_MODE) {
            console.log('Loading services using optimized high-performance method...');
        }
        const startTime = performance.now();

        // Use our optimized ServiceManager
        const services = await ServiceManager.getAllServices();

        if (!services || services.length === 0) {
            throw new Error('No services returned from ServiceManager');
        }

        const loadTime = performance.now() - startTime;
        if (!SILENT_MODE) {
            console.log(`Successfully loaded ${services.length} services in ${loadTime.toFixed(2)}ms`);
        }

        allServices = services;
        await loadQuickAccessPreferences();
        applyFilters(container);
        updateServiceCount(container);
        renderQuickAccessServices(container);

        const totalTime = performance.now() - startTime;
        if (!SILENT_MODE) {
            console.log(`Total service loading and rendering completed in ${totalTime.toFixed(2)}ms`);
        }
    } catch (error) {
        if (!SILENT_MODE) {
            console.error('Error loading services:', error);
        }
        if (window.electronAPI?.logError) {
            window.electronAPI.logError(`Error loading services: ${error.message}`, 'ServicesTab');
        }
        showError(container, 'Failed to load services: ' + error.message);
    } finally {
        isLoading = false;
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
            return (
                service.Name.toLowerCase().includes(searchTerm) ||
                service.DisplayName.toLowerCase().includes(searchTerm)
            );
        }

        return true;
    });

    renderServicesTable(container);
    updateServiceCount(container);
}

function updateServiceCount(container) {
    const countElement = getElement(container, 'service-count');
    if (countElement) {
        countElement.textContent = `${filteredServices.length} of ${allServices.length} services`;
    }
}

// Service details display function
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
        { label: 'Service Type', value: details.ServiceType || 'Unknown' },
    ]);
    detailGrid.appendChild(basicCard);

    // Capabilities Card
    const capabilitiesData = [
        { label: 'Can Stop', value: details.CanStop ? 'Yes' : 'No' },
        { label: 'Can Pause', value: details.CanPauseAndContinue ? 'Yes' : 'No' },
        { label: 'Can Shutdown', value: details.CanShutdown ? 'Yes' : 'No' },
    ];

    const capabilitiesCard = createDetailCard('Capabilities', capabilitiesData);
    detailGrid.appendChild(capabilitiesCard);

    modalContent.appendChild(detailGrid);

    // Executable Path Card
    if (details.PathName) {
        const pathCard = createDetailCard('Executable Path');
        const pathPara = document.createElement('p');
        pathPara.style.cssText =
            'margin: 0; color: var(--text-primary); font-family: "Courier New", monospace; font-size: 12px; word-break: break-all;';
        pathPara.textContent = details.PathName;
        pathCard.appendChild(pathPara);
        modalContent.appendChild(pathCard);
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

// Render services table
function renderServicesTable(container) {
    const tableBody = getElement(container, 'services-table-body');
    if (!tableBody) return;

    // Clear existing content
    tableBody.innerHTML = '';

    // Create table rows securely using DOM methods
    filteredServices.forEach(service => {
        if (!validateServiceName(service.Name)) {
            if (!SILENT_MODE) {
                console.warn('Invalid service name detected:', service.Name);
            }
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
        const startTypeSpan = document.createElement('span');
        startTypeSpan.className = 'service-start-type';
        startTypeSpan.textContent = service.StartType || 'Unknown';
        startTypeCell.appendChild(startTypeSpan);

        // Dependencies cell (simplified for now)
        const depCell = document.createElement('td');
        const depSpan = document.createElement('span');
        depSpan.className = 'service-dependencies';
        depSpan.textContent = '-';
        depSpan.title = 'Dependencies information not available';
        depCell.appendChild(depSpan);

        // Actions cell
        const actionsCell = document.createElement('td');
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'service-actions';

        // Create action buttons securely
        if (service.Status === 'Running') {
            const stopBtn = createSecureButton(
                '<i class="fas fa-stop"></i>',
                () => controlServiceSecure(service.Name, 'stop'),
                'btn btn-primary btn-sm',
                'Stop Service'
            );
            actionsDiv.appendChild(stopBtn);
        } else {
            const startBtn = createSecureButton(
                '<i class="fas fa-play"></i>',
                () => controlServiceSecure(service.Name, 'start'),
                'btn btn-primary btn-sm',
                'Start Service'
            );
            actionsDiv.appendChild(startBtn);
        }

        const restartBtn = createSecureButton(
            '<i class="fas fa-redo"></i>',
            () => controlServiceSecure(service.Name, 'restart'),
            'btn btn-primary btn-sm',
            'Restart Service'
        );
        actionsDiv.appendChild(restartBtn);

        const detailsBtn = createSecureButton(
            '<i class="fas fa-info-circle"></i>',
            () => showServiceDetailsSecure(service.Name),
            'btn btn-primary btn-sm',
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

// Quick access functionality
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
            if (!SILENT_MODE) {
                console.warn('Invalid service name detected:', service.Name);
            }
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
                'btn btn-primary btn-sm',
                'Stop Service'
            );
            actions.appendChild(stopBtn);
        } else {
            const startBtn = createSecureButton(
                '<i class="fas fa-play"></i> Start',
                () => controlServiceSecure(service.Name, 'start'),
                'btn btn-primary btn-sm',
                'Start Service'
            );
            actions.appendChild(startBtn);
        }

        const restartBtn = createSecureButton(
            '<i class="fas fa-redo"></i> Restart',
            () => controlServiceSecure(service.Name, 'restart'),
            'btn btn-primary btn-sm',
            'Restart Service'
        );
        actions.appendChild(restartBtn);

        const detailsBtn = createSecureButton(
            '<i class="fas fa-info-circle"></i> Details',
            () => showServiceDetailsSecure(service.Name),
            'btn btn-primary btn-sm',
            'Service Details'
        );
        actions.appendChild(detailsBtn);

        card.appendChild(header);
        card.appendChild(actions);
        quickGrid.appendChild(card);
    });
}

async function loadQuickAccessPreferences() {
    try {
        if (window.electronAPI?.getSetting) {
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
        if (!SILENT_MODE) {
            console.error('Error loading quick access preferences:', error);
        }
        // Fallback to defaults
        quickAccessServices = allServices.filter(service =>
            defaultCommonServiceNames.includes(service.Name)
        );
    }
}

// Event handlers setup
function setupEventListeners(container) {
    // Search input
    const searchInput = getElement(container, 'service-search');
    if (searchInput) {
        searchInput.addEventListener('input', e => {
            currentFilter.search = e.target.value.toLowerCase();
            applyFilters(container);
        });
    }

    // Status filter
    const statusFilter = getElement(container, 'status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', e => {
            currentFilter.status = e.target.value;
            applyFilters(container);
        });
    }

    // Type filter
    const typeFilter = getElement(container, 'type-filter');
    if (typeFilter) {
        typeFilter.addEventListener('change', e => {
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

    // Customize quick access button
    const customizeBtn = getElement(container, 'customize-quick-access');
    if (customizeBtn) {
        customizeBtn.addEventListener('click', () => {
            showCustomizeModal(container);
        });
    }

    // Modal close buttons
    const closeDetailsModal = getElement(container, 'close-details-modal');
    if (closeDetailsModal) {
        closeDetailsModal.addEventListener('click', () => {
            hideModal(container, 'service-details-modal');
        });
    }

    const closeCustomizeModal = getElement(container, 'close-customize-modal');
    if (closeCustomizeModal) {
        closeCustomizeModal.addEventListener('click', () => {
            hideModal(container, 'customize-modal');
        });
    }

    // Close modal when clicking outside
    const detailsModal = getElement(container, 'service-details-modal');
    if (detailsModal) {
        detailsModal.addEventListener('click', e => {
            if (e.target === detailsModal) {
                hideModal(container, 'service-details-modal');
            }
        });
    }

    const customizeModal = getElement(container, 'customize-modal');
    if (customizeModal) {
        customizeModal.addEventListener('click', e => {
            if (e.target === customizeModal) {
                hideModal(container, 'customize-modal');
            }
        });
    }

    const progressModal = getElement(container, 'progress-modal');
    if (progressModal) {
        progressModal.addEventListener('click', e => {
            if (e.target === progressModal) {
                // Don't allow closing progress modal by clicking outside
            }
        });
    }
}

// Initialize lazy loading helper
const lazyHelper = new LazyLoadingHelper('services');

/**
 * Initialize the Services Management tab
 */
function initServicesTab() {
    // Check if should initialize (lazy loading support)
    if (!lazyHelper.shouldInitialize()) {
        lazyHelper.markTabReady();
        return;
    }

    // Mark script as executed to prevent duplicate initialization
    lazyHelper.markScriptExecuted();

    // Find the appropriate container for this tab using multiple strategies
    const container =
        document.querySelector('[data-tab="services"]') || // Static tab container
        document.querySelector('[data-tab="folder-services"]') || // Dynamic folder tab
        document.querySelector('.services-container') || // Class-based container
        document; // Global fallback

    if (container) {
        // Initialize with the discovered container
        initializeServicesManager(container);
    } else {
        // Fallback: try to initialize anyway using global selectors
        initializeServicesManager(document);
    }
}

// Initialize the tab when it loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initServicesTab);
} else {
    initServicesTab();
}

// Create global reset function for refresh functionality
lazyHelper.createGlobalResetFunction();

async function initializeServicesManager(container) {
    try {
        // Set up event listeners
        setupEventListeners(container);

        // Load services
        await loadServices(container);

        // Signal that this tab is ready
        lazyHelper.markTabReady();
    } catch (error) {
        if (!SILENT_MODE) {
            console.error('Error initializing Services Manager:', error);
        }
        if (window.electronAPI?.logError) {
            window.electronAPI.logError(
                `Error initializing Services Manager: ${error.message}`,
                'ServicesTab'
            );
        }
        showError(container, 'Failed to initialize Services Manager: ' + error.message);
        // Still signal ready even if there was an error
        lazyHelper.markTabReady();
    }
}

// Legacy function exports for backward compatibility
window.controlService = controlServiceSecure;
window.showServiceDetails = showServiceDetailsSecure;
