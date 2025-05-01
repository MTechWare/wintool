/**
 * WinTool - Setup Tab JavaScript
 * Handles functionality specific to the unattended setup tab
 */

// Initialize the setup tab
function initSetupTab() {
    console.log('Setup tab initialized');
    
    // Set up sidebar navigation
    setupSidebarNavigation();
    
    // Set up navigation buttons
    setupNavigationButtons();
    
    // Set up export buttons
    setupExportButtons();
    
    // Set up app chips
    setupAppChips();
    
    // Set up network type options
    setupNetworkOptions();
    
    // Set up partition scheme options
    setupPartitionOptions();
    
    // Set up configuration templates
    setupConfigTemplates();
}

// Set up sidebar navigation
function setupSidebarNavigation() {
    const navItems = Array.from(document.querySelectorAll('.setup-nav-item'));
    const setupPanels = Array.from(document.querySelectorAll('.setup-panel'));
    let currentTabIdx = 0;
    
    function showTab(idx) {
        // Update navigation items
        navItems.forEach((item, i) => {
            item.classList.toggle('active', i === idx);
        });
        
        // Update panels
        setupPanels.forEach((panel, i) => {
            panel.classList.toggle('active', i === idx);
        });
        
        currentTabIdx = idx;
        
        // Update navigation button states
        const prevButton = document.getElementById('unattend-prev');
        const nextButton = document.getElementById('unattend-next');
        
        if (prevButton) prevButton.disabled = (idx === 0);
        if (nextButton) nextButton.disabled = (idx === navItems.length - 1);
    }
    
    // Add click event listeners to navigation items
    navItems.forEach((item, idx) => {
        item.addEventListener('click', () => showTab(idx));
    });
    
    // Store the showTab function for use by navigation buttons
    window.showUnattendTab = showTab;
    window.currentUnattendTabIdx = currentTabIdx;
}

// Set up navigation buttons
function setupNavigationButtons() {
    const nextButton = document.getElementById('unattend-next');
    const prevButton = document.getElementById('unattend-prev');
    
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            if (window.currentUnattendTabIdx < document.querySelectorAll('.setup-nav-item').length - 1) {
                window.showUnattendTab(window.currentUnattendTabIdx + 1);
            }
        });
    }
    
    if (prevButton) {
        prevButton.addEventListener('click', () => {
            if (window.currentUnattendTabIdx > 0) {
                window.showUnattendTab(window.currentUnattendTabIdx - 1);
            }
        });
    }
}

// Set up network type options
function setupNetworkOptions() {
    const networkTypeSelect = document.getElementById('networkType');
    const staticOptions = document.querySelectorAll('.network-static-options');
    const domainOptions = document.querySelectorAll('.network-domain-options');
    
    if (networkTypeSelect) {
        networkTypeSelect.addEventListener('change', function() {
            const selectedValue = this.value;
            
            // Show/hide static IP options
            staticOptions.forEach(option => {
                option.style.display = (selectedValue === 'static') ? 'block' : 'none';
            });
            
            // Show/hide domain options
            domainOptions.forEach(option => {
                option.style.display = (selectedValue === 'domain') ? 'block' : 'none';
            });
        });
    }
}

// Set up partition scheme options
function setupPartitionOptions() {
    const partitionSchemeSelect = document.getElementById('partitionScheme');
    const customOptions = document.querySelectorAll('.partition-custom-options');
    
    if (partitionSchemeSelect) {
        partitionSchemeSelect.addEventListener('change', function() {
            const selectedValue = this.value;
            
            // Show/hide custom partition options
            customOptions.forEach(option => {
                option.style.display = (selectedValue === 'custom') ? 'block' : 'none';
            });
        });
    }
}

// Set up app chips for quick selection
function setupAppChips() {
    const appChips = document.querySelectorAll('.app-chip');
    const appsListInput = document.getElementById('appsList');
    
    if (appChips.length && appsListInput) {
        appChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const appName = chip.getAttribute('data-app');
                if (appName) {
                    // Get current apps list
                    const currentApps = appsListInput.value
                        ? appsListInput.value.split(',').map(app => app.trim())
                        : [];
                    
                    // Check if app is already in the list
                    if (!currentApps.includes(appName)) {
                        // Add the app to the list
                        currentApps.push(appName);
                        appsListInput.value = currentApps.join(', ');
                        
                        // Visual feedback
                        chip.classList.add('selected');
                        setTimeout(() => chip.classList.remove('selected'), 500);
                        
                        showNotification(`Added ${appName} to the installation list`, { type: 'info' });
                    } else {
                        // Remove the app from the list
                        const updatedApps = currentApps.filter(app => app !== appName);
                        appsListInput.value = updatedApps.join(', ');
                        
                        // Visual feedback
                        chip.classList.add('deselected');
                        setTimeout(() => chip.classList.remove('deselected'), 500);
                        
                        showNotification(`Removed ${appName} from the installation list`, { type: 'info' });
                    }
                }
            });
        });
    }
}

// Set up configuration templates
function setupConfigTemplates() {
    const templateButtons = document.querySelectorAll('.template-btn');
    
    if (templateButtons.length) {
        templateButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const templateType = this.getAttribute('data-template');
                
                // Apply template based on type
                switch(templateType) {
                    case 'basic':
                        applyBasicTemplate();
                        break;
                    case 'gaming':
                        applyGamingTemplate();
                        break;
                    case 'office':
                        applyOfficeTemplate();
                        break;
                    case 'developer':
                        applyDeveloperTemplate();
                        break;
                }
                
                showNotification(`Applied ${templateType} configuration template`, { type: 'success' });
            });
        });
    }
}

// Apply Basic Workstation template
function applyBasicTemplate() {
    // System settings
    document.getElementById('computerName').value = 'BasicPC';
    document.getElementById('organization').value = 'Home';
    document.getElementById('owner').value = 'User';
    document.getElementById('windowsEdition').value = 'Windows 10 Home';
    
    // Regional settings - leave as default
    
    // User settings
    document.getElementById('autoLogin').checked = true;
    
    // Privacy settings
    document.getElementById('disableTelemetry').checked = true;
    document.getElementById('disableCortana').checked = true;
    document.getElementById('disableLocation').checked = true;
    
    // Network settings
    document.getElementById('networkType').value = 'dhcp';
    
    // Advanced settings
    document.getElementById('partitionScheme').value = 'automatic';
    document.getElementById('bootMode').value = 'uefi';
    document.getElementById('bitLocker').value = 'disabled';
    document.getElementById('windowsUpdates').value = 'automatic';
    document.getElementById('powerPlan').value = 'balanced';
    document.getElementById('enableRemoteDesktop').checked = false;
    document.getElementById('disableHibernation').checked = false;
    document.getElementById('disableUAC').checked = false;
    document.getElementById('installWinTool').checked = true;
}

// Apply Gaming PC template
function applyGamingTemplate() {
    // System settings
    document.getElementById('computerName').value = 'GamingPC';
    document.getElementById('organization').value = 'Home';
    document.getElementById('owner').value = 'Gamer';
    document.getElementById('windowsEdition').value = 'Windows 10 Pro';
    
    // Regional settings - leave as default
    
    // User settings
    document.getElementById('autoLogin').checked = true;
    
    // Privacy settings
    document.getElementById('disableTelemetry').checked = true;
    document.getElementById('disableCortana').checked = true;
    document.getElementById('disableLocation').checked = true;
    
    // Network settings
    document.getElementById('networkType').value = 'dhcp';
    
    // Advanced settings
    document.getElementById('partitionScheme').value = 'automatic';
    document.getElementById('bootMode').value = 'uefi';
    document.getElementById('bitLocker').value = 'disabled';
    document.getElementById('windowsUpdates').value = 'notify';
    document.getElementById('powerPlan').value = 'performance';
    document.getElementById('enableRemoteDesktop').checked = false;
    document.getElementById('disableHibernation').checked = true;
    document.getElementById('disableUAC').checked = false;
    document.getElementById('installWinTool').checked = true;
}

// Apply Office Computer template
function applyOfficeTemplate() {
    // System settings
    document.getElementById('computerName').value = 'OfficePC';
    document.getElementById('organization').value = 'Company';
    document.getElementById('owner').value = 'Employee';
    document.getElementById('windowsEdition').value = 'Windows 10 Pro';
    
    // Regional settings - leave as default
    
    // User settings
    document.getElementById('autoLogin').checked = false;
    
    // Privacy settings
    document.getElementById('disableTelemetry').checked = false;
    document.getElementById('disableCortana').checked = false;
    document.getElementById('disableLocation').checked = false;
    
    // Network settings
    document.getElementById('networkType').value = 'domain';
    document.getElementById('domainName').value = 'company.local';
    document.getElementById('dnsServers').value = '192.168.1.10, 192.168.1.11';
    
    // Advanced settings
    document.getElementById('partitionScheme').value = 'automatic';
    document.getElementById('bootMode').value = 'uefi';
    document.getElementById('bitLocker').value = 'enabled';
    document.getElementById('windowsUpdates').value = 'automatic';
    document.getElementById('powerPlan').value = 'balanced';
    document.getElementById('enableRemoteDesktop').checked = true;
    document.getElementById('disableHibernation').checked = false;
    document.getElementById('disableUAC').checked = false;
    document.getElementById('installWinTool').checked = true;
}

// Apply Developer Machine template
function applyDeveloperTemplate() {
    // System settings
    document.getElementById('computerName').value = 'DevPC';
    document.getElementById('organization').value = 'Developer';
    document.getElementById('owner').value = 'Developer';
    document.getElementById('windowsEdition').value = 'Windows 10 Pro';
    
    // Regional settings - leave as default
    
    // User settings
    document.getElementById('autoLogin').checked = true;
    
    // Privacy settings
    document.getElementById('disableTelemetry').checked = true;
    document.getElementById('disableCortana').checked = true;
    document.getElementById('disableLocation').checked = false;
    
    // Network settings
    document.getElementById('networkType').value = 'static';
    document.getElementById('staticIP').value = '192.168.1.100';
    document.getElementById('subnetMask').value = '255.255.255.0';
    document.getElementById('defaultGateway').value = '192.168.1.1';
    document.getElementById('dnsServers').value = '8.8.8.8, 1.1.1.1';
    
    // Advanced settings
    document.getElementById('partitionScheme').value = 'custom';
    document.getElementById('systemPartitionSize').value = '150';
    document.getElementById('bootMode').value = 'uefi';
    document.getElementById('bitLocker').value = 'enabled';
    document.getElementById('windowsUpdates').value = 'notify';
    document.getElementById('powerPlan').value = 'performance';
    document.getElementById('enableRemoteDesktop').checked = true;
    document.getElementById('disableHibernation').checked = false;
    document.getElementById('disableUAC').checked = false;
    document.getElementById('installWinTool').checked = true;
}

// Collect form data from the unattended setup form
function collectFormData() {
    const form = document.getElementById('unattend-form');
    if (!form) return {};
    
    // Collect all input values
    const data = {
        // System settings
        computerName: document.getElementById('computerName')?.value || '',
        organization: document.getElementById('organization')?.value || '',
        owner: document.getElementById('owner')?.value || '',
        productKey: document.getElementById('productKey')?.value || '',
        windowsEdition: document.getElementById('windowsEdition')?.value || '',
        
        // Regional settings
        language: document.getElementById('language')?.value || '',
        timezone: document.getElementById('timezone')?.value || '',
        keyboard: document.getElementById('keyboard')?.value || '',
        
        // User settings
        username: document.getElementById('username')?.value || '',
        password: document.getElementById('password')?.value || '',
        autoLogin: document.getElementById('autoLogin')?.checked || false,
        
        // Privacy settings
        disableTelemetry: document.getElementById('disableTelemetry')?.checked || false,
        disableCortana: document.getElementById('disableCortana')?.checked || false,
        disableLocation: document.getElementById('disableLocation')?.checked || false,
        
        // Network settings
        networkType: document.getElementById('networkType')?.value || 'dhcp',
        staticIP: document.getElementById('staticIP')?.value || '',
        subnetMask: document.getElementById('subnetMask')?.value || '',
        defaultGateway: document.getElementById('defaultGateway')?.value || '',
        dnsServers: document.getElementById('dnsServers')?.value || '',
        domainName: document.getElementById('domainName')?.value || '',
        
        // Advanced settings
        partitionScheme: document.getElementById('partitionScheme')?.value || 'automatic',
        systemPartitionSize: document.getElementById('systemPartitionSize')?.value || '100',
        bootMode: document.getElementById('bootMode')?.value || 'uefi',
        bitLocker: document.getElementById('bitLocker')?.value || 'disabled',
        windowsUpdates: document.getElementById('windowsUpdates')?.value || 'automatic',
        powerPlan: document.getElementById('powerPlan')?.value || 'balanced',
        enableRemoteDesktop: document.getElementById('enableRemoteDesktop')?.checked || false,
        disableHibernation: document.getElementById('disableHibernation')?.checked || false,
        disableUAC: document.getElementById('disableUAC')?.checked || false,
        installWinTool: document.getElementById('installWinTool')?.checked || false,
        
        // Apps
        apps: window.selectedApps || []
    };
    
    return data;
}

// Set up export buttons
function setupExportButtons() {
    const jsonButton = document.getElementById('export-json');
    const xmlButton = document.getElementById('export-xml');
    
    if (jsonButton) {
        jsonButton.addEventListener('click', () => {
            const data = collectFormData();
            const jsonString = JSON.stringify(data, null, 2);
            
            // Create a blob and download it
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'unattend-config.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showNotification('Exported JSON configuration file', { type: 'success' });
        });
    }
    
    if (xmlButton) {
        xmlButton.addEventListener('click', () => {
            const data = collectFormData();
            
            // Convert JSON to simple XML format
            let xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n';
            xmlString += '<unattendedSetup>\n';
            
            // Add system settings
            xmlString += '  <system>\n';
            xmlString += `    <computerName>${data.computerName || ''}</computerName>\n`;
            xmlString += `    <organization>${data.organization || ''}</organization>\n`;
            xmlString += `    <owner>${data.owner || ''}</owner>\n`;
            xmlString += `    <productKey>${data.productKey || ''}</productKey>\n`;
            xmlString += `    <windowsEdition>${data.windowsEdition || ''}</windowsEdition>\n`;
            xmlString += '  </system>\n';
            
            // Add regional settings
            xmlString += '  <regional>\n';
            xmlString += `    <language>${data.language || ''}</language>\n`;
            xmlString += `    <timezone>${data.timezone || ''}</timezone>\n`;
            xmlString += `    <keyboard>${data.keyboard || ''}</keyboard>\n`;
            xmlString += '  </regional>\n';
            
            // Add user settings
            xmlString += '  <user>\n';
            xmlString += `    <username>${data.username || ''}</username>\n`;
            xmlString += `    <password>${data.password ? '********' : ''}</password>\n`;
            xmlString += `    <autoLogin>${data.autoLogin || false}</autoLogin>\n`;
            xmlString += '  </user>\n';
            
            // Add privacy settings
            xmlString += '  <privacy>\n';
            xmlString += `    <disableTelemetry>${data.disableTelemetry || false}</disableTelemetry>\n`;
            xmlString += `    <disableCortana>${data.disableCortana || false}</disableCortana>\n`;
            xmlString += `    <disableLocation>${data.disableLocation || false}</disableLocation>\n`;
            xmlString += '  </privacy>\n';
            
            // Add network settings
            xmlString += '  <network>\n';
            xmlString += `    <type>${data.networkType || 'dhcp'}</type>\n`;
            if (data.networkType === 'static') {
                xmlString += `    <staticIP>${data.staticIP || ''}</staticIP>\n`;
                xmlString += `    <subnetMask>${data.subnetMask || ''}</subnetMask>\n`;
                xmlString += `    <defaultGateway>${data.defaultGateway || ''}</defaultGateway>\n`;
            }
            if (data.networkType === 'domain') {
                xmlString += `    <domainName>${data.domainName || ''}</domainName>\n`;
            }
            xmlString += `    <dnsServers>${data.dnsServers || ''}</dnsServers>\n`;
            xmlString += '  </network>\n';
            
            // Add advanced settings
            xmlString += '  <advanced>\n';
            if (data.partitionScheme) {
                xmlString += `    <partitionScheme>${data.partitionScheme}</partitionScheme>\n`;
                if (data.partitionScheme === 'custom') {
                    xmlString += `    <systemPartitionSize>${data.systemPartitionSize || '100'}</systemPartitionSize>\n`;
                }
            }
            if (data.bootMode) xmlString += `    <bootMode>${data.bootMode}</bootMode>\n`;
            if (data.bitLocker) xmlString += `    <bitLocker>${data.bitLocker}</bitLocker>\n`;
            if (data.windowsUpdates) xmlString += `    <windowsUpdates>${data.windowsUpdates}</windowsUpdates>\n`;
            if (data.powerPlan) xmlString += `    <powerPlan>${data.powerPlan}</powerPlan>\n`;
            xmlString += `    <enableRemoteDesktop>${data.enableRemoteDesktop || false}</enableRemoteDesktop>\n`;
            xmlString += `    <disableHibernation>${data.disableHibernation || false}</disableHibernation>\n`;
            xmlString += `    <disableUAC>${data.disableUAC || false}</disableUAC>\n`;
            xmlString += `    <installWinTool>${data.installWinTool || false}</installWinTool>\n`;
            xmlString += '  </advanced>\n';
            
            // Add apps
            xmlString += '  <apps>\n';
            if (data.apps && Array.isArray(data.apps)) {
                data.apps.forEach(app => {
                    xmlString += `    <app>${app}</app>\n`;
                });
            }
            xmlString += '  </apps>\n';
            
            xmlString += '</unattendedSetup>';
            
            // Create a blob and download it
            const blob = new Blob([xmlString], { type: 'application/xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'unattend-config.xml';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showNotification('Exported XML configuration file', { type: 'success' });
        });
    }
}

// Export the initialization function
window.initSetupTab = initSetupTab;
