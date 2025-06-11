/**
 * Windows Unattend Tab JavaScript
 *
 * This script handles creating and exporting Windows unattend.xml files
 */

console.log('Windows Unattend tab script loaded');

// Preset configurations
const presets = {
    basic: {
        name: 'Basic Setup',
        adminUsername: 'Administrator',
        adminPassword: 'P@ssw0rd123',
        userUsername: 'User',
        userPassword: 'User123',
        autoLogon: true,
        hideAdmin: true,
        timezone: 'Eastern Standard Time',
        language: 'en-US',
        keyboard: '0409:00000409',
        locale: 'en-US',
        computerName: 'WIN-DESKTOP',
        workgroup: 'WORKGROUP',
        organization: 'My Company',
        owner: 'System Administrator',
        description: 'Windows 11 Workstation',
        windowsEdition: 'Windows 11 Pro',
        architecture: 'amd64',
        acceptEula: true,
        skipOem: true,
        enableNetwork: true,
        skipNetworkSetup: true,
        joinDomain: false,
        featureDefender: true,
        featureFirewall: true,
        featureUac: true,
        featureSmartscreen: true,
        featureTelemetry: true,
        featureCortana: true,
        featureLocation: true,
        featureAds: true,
        featureUpdates: true,
        featureHibernation: false,
        featureRemoteDesktop: false,
        featurePowershell: true,
        oobeSkipMachine: true,
        oobeSkipUser: true,
        oobeHideEula: true,
        oobeHideWireless: true,
        oobeProtectPc: true,
        oobeHideOnlineAccount: true
    },
    enterprise: {
        name: 'Enterprise Setup',
        adminUsername: 'Administrator',
        adminPassword: 'Ent3rpr1se!',
        userUsername: '',
        userPassword: '',
        autoLogon: false,
        hideAdmin: true,
        timezone: 'Eastern Standard Time',
        language: 'en-US',
        keyboard: '0409:00000409',
        locale: 'en-US',
        computerName: '',
        workgroup: 'WORKGROUP',
        organization: 'Enterprise Corp',
        owner: 'IT Department',
        description: 'Enterprise Workstation',
        windowsEdition: 'Windows 11 Enterprise',
        architecture: 'amd64',
        acceptEula: true,
        skipOem: true,
        enableNetwork: true,
        skipNetworkSetup: false,
        joinDomain: true,
        domainName: 'corp.local',
        domainUsername: 'domain\\admin',
        featureDefender: true,
        featureFirewall: true,
        featureUac: true,
        featureSmartscreen: true,
        featureTelemetry: false,
        featureCortana: false,
        featureLocation: false,
        featureAds: false,
        featureUpdates: true,
        featureHibernation: false,
        featureRemoteDesktop: true,
        featurePowershell: true,
        oobeSkipMachine: true,
        oobeSkipUser: false,
        oobeHideEula: true,
        oobeHideWireless: true,
        oobeProtectPc: true,
        oobeHideOnlineAccount: true
    },
    secure: {
        name: 'Secure Setup',
        adminUsername: 'Administrator',
        adminPassword: 'S3cur3P@ss!',
        userUsername: 'SecureUser',
        userPassword: 'S3cur3Us3r!',
        autoLogon: false,
        hideAdmin: true,
        timezone: 'Eastern Standard Time',
        language: 'en-US',
        keyboard: '0409:00000409',
        locale: 'en-US',
        computerName: 'SECURE-PC',
        workgroup: 'WORKGROUP',
        organization: 'Secure Organization',
        owner: 'Security Administrator',
        description: 'Secure Windows Workstation',
        windowsEdition: 'Windows 11 Pro',
        architecture: 'amd64',
        acceptEula: true,
        skipOem: true,
        enableNetwork: true,
        skipNetworkSetup: true,
        joinDomain: false,
        featureDefender: true,
        featureFirewall: true,
        featureUac: true,
        featureSmartscreen: true,
        featureTelemetry: true,
        featureCortana: true,
        featureLocation: true,
        featureAds: true,
        featureUpdates: true,
        featureHibernation: false,
        featureRemoteDesktop: false,
        featurePowershell: false,
        oobeSkipMachine: true,
        oobeSkipUser: true,
        oobeHideEula: true,
        oobeHideWireless: true,
        oobeProtectPc: true,
        oobeHideOnlineAccount: true
    }
};

/**
 * Load a preset configuration
 */
function loadPreset(presetName) {
    const preset = presets[presetName];
    if (!preset) {
        showStatusMessage('error', `Preset "${presetName}" not found`);
        return;
    }

    // Load all form values from preset
    document.getElementById('admin-username').value = preset.adminUsername;
    document.getElementById('admin-password').value = preset.adminPassword;
    document.getElementById('user-username').value = preset.userUsername;
    document.getElementById('user-password').value = preset.userPassword;
    document.getElementById('auto-logon').checked = preset.autoLogon;
    document.getElementById('hide-admin').checked = preset.hideAdmin;
    
    document.getElementById('timezone').value = preset.timezone;
    document.getElementById('language').value = preset.language;
    document.getElementById('keyboard').value = preset.keyboard;
    document.getElementById('locale').value = preset.locale;
    
    document.getElementById('computer-name').value = preset.computerName;
    document.getElementById('workgroup').value = preset.workgroup;
    document.getElementById('organization').value = preset.organization;
    document.getElementById('owner').value = preset.owner;
    document.getElementById('description').value = preset.description;
    
    document.getElementById('windows-edition').value = preset.windowsEdition;
    document.getElementById('architecture').value = preset.architecture;
    document.getElementById('accept-eula').checked = preset.acceptEula;
    document.getElementById('skip-oem').checked = preset.skipOem;
    
    document.getElementById('enable-network').checked = preset.enableNetwork;
    document.getElementById('skip-network-setup').checked = preset.skipNetworkSetup;
    document.getElementById('join-domain').checked = preset.joinDomain;
    
    if (preset.joinDomain && preset.domainName) {
        document.getElementById('domain-name').value = preset.domainName;
        document.getElementById('domain-username').value = preset.domainUsername || '';
        document.getElementById('domain-settings').style.display = 'block';
    } else {
        document.getElementById('domain-settings').style.display = 'none';
    }
    
    // Load feature checkboxes
    document.getElementById('feature-defender').checked = preset.featureDefender;
    document.getElementById('feature-firewall').checked = preset.featureFirewall;
    document.getElementById('feature-uac').checked = preset.featureUac;
    document.getElementById('feature-smartscreen').checked = preset.featureSmartscreen;
    document.getElementById('feature-telemetry').checked = preset.featureTelemetry;
    document.getElementById('feature-cortana').checked = preset.featureCortana;
    document.getElementById('feature-location').checked = preset.featureLocation;
    document.getElementById('feature-ads').checked = preset.featureAds;
    document.getElementById('feature-updates').checked = preset.featureUpdates;
    document.getElementById('feature-hibernation').checked = preset.featureHibernation;
    document.getElementById('feature-remote-desktop').checked = preset.featureRemoteDesktop;
    document.getElementById('feature-powershell').checked = preset.featurePowershell;
    
    // Load OOBE settings
    document.getElementById('oobe-skip-machine-oobe').checked = preset.oobeSkipMachine;
    document.getElementById('oobe-skip-user-oobe').checked = preset.oobeSkipUser;
    document.getElementById('oobe-hide-eula').checked = preset.oobeHideEula;
    document.getElementById('oobe-hide-wireless').checked = preset.oobeHideWireless;
    document.getElementById('oobe-protect-pc').checked = preset.oobeProtectPc;
    document.getElementById('oobe-hide-online-account').checked = preset.oobeHideOnlineAccount;

    showStatusMessage('success', `Loaded "${preset.name}" preset configuration`);
}

/**
 * Generate Windows unattend.xml content based on form data
 */
function generateUnattendXML() {
    // Get form values
    const adminUsername = document.getElementById('admin-username')?.value || 'Administrator';
    const adminPassword = document.getElementById('admin-password')?.value || '';
    const userUsername = document.getElementById('user-username')?.value || '';
    const userPassword = document.getElementById('user-password')?.value || '';
    const autoLogon = document.getElementById('auto-logon')?.checked || false;
    const hideAdmin = document.getElementById('hide-admin')?.checked || false;

    const timezone = document.getElementById('timezone')?.value || 'Eastern Standard Time';
    const language = document.getElementById('language')?.value || 'en-US';
    const keyboard = document.getElementById('keyboard')?.value || '0409:00000409';
    const locale = document.getElementById('locale')?.value || 'en-US';

    const computerName = document.getElementById('computer-name')?.value || 'WIN-DESKTOP';
    const workgroup = document.getElementById('workgroup')?.value || 'WORKGROUP';
    const organization = document.getElementById('organization')?.value || '';
    const owner = document.getElementById('owner')?.value || 'User';
    const description = document.getElementById('description')?.value || '';

    const windowsEdition = document.getElementById('windows-edition')?.value || 'Windows 11 Pro';
    const architecture = document.getElementById('architecture')?.value || 'amd64';
    const productKey = document.getElementById('product-key')?.value || '';
    const acceptEula = document.getElementById('accept-eula')?.checked || true;
    const skipOem = document.getElementById('skip-oem')?.checked || true;

    const enableNetwork = document.getElementById('enable-network')?.checked || true;
    const skipNetworkSetup = document.getElementById('skip-network-setup')?.checked || true;
    const joinDomain = document.getElementById('join-domain')?.checked || false;
    const domainName = document.getElementById('domain-name')?.value || '';
    const domainUsername = document.getElementById('domain-username')?.value || '';
    const domainPassword = document.getElementById('domain-password')?.value || '';

    // Get OOBE settings
    const oobeSkipMachine = document.getElementById('oobe-skip-machine-oobe')?.checked || false;
    const oobeSkipUser = document.getElementById('oobe-skip-user-oobe')?.checked || false;
    const oobeHideEula = document.getElementById('oobe-hide-eula')?.checked || false;
    const oobeHideWireless = document.getElementById('oobe-hide-wireless')?.checked || false;
    const oobeProtectPc = document.getElementById('oobe-protect-pc')?.checked || false;
    const oobeHideOnlineAccount = document.getElementById('oobe-hide-online-account')?.checked || false;

    // Generate XML content
    let xml = `<?xml version="1.0" encoding="utf-8"?>
<unattend xmlns="urn:schemas-microsoft-com:unattend">
    <!-- Windows PE Pass -->
    <settings pass="windowsPE">
        <component name="Microsoft-Windows-International-Core-WinPE" processorArchitecture="${architecture}" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <SetupUILanguage>
                <UILanguage>${language}</UILanguage>
            </SetupUILanguage>
            <InputLocale>${keyboard}</InputLocale>
            <SystemLocale>${language}</SystemLocale>
            <UILanguage>${language}</UILanguage>
            <UserLocale>${locale}</UserLocale>
        </component>
        <component name="Microsoft-Windows-Setup" processorArchitecture="${architecture}" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`;

    // Always include UserData section - required for Windows Setup
    xml += `
            <UserData>`;

    if (productKey) {
        xml += `
                <ProductKey>
                    <Key>${productKey}</Key>
                </ProductKey>`;
    }

    xml += `
                <AcceptEula>${acceptEula}</AcceptEula>
                <FullName>${owner || 'User'}</FullName>
                <Organization>${organization || 'Organization'}</Organization>
            </UserData>`;

    xml += `
            <UseConfigurationSet>true</UseConfigurationSet>
            <EnableNetwork>${enableNetwork}</EnableNetwork>
            <ImageInstall>
                <OSImage>
                    <InstallTo>
                        <DiskID>0</DiskID>
                        <PartitionID>2</PartitionID>
                    </InstallTo>
                    <InstallToAvailablePartition>false</InstallToAvailablePartition>
                </OSImage>
            </ImageInstall>
        </component>
    </settings>

    <!-- Specialize Pass -->
    <settings pass="specialize">
        <component name="Microsoft-Windows-Shell-Setup" processorArchitecture="${architecture}" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <ComputerName>${computerName || '*'}</ComputerName>
            <TimeZone>${timezone}</TimeZone>`;

    if (organization) {
        xml += `
            <RegisteredOrganization>${organization}</RegisteredOrganization>`;
    }

    if (owner) {
        xml += `
            <RegisteredOwner>${owner}</RegisteredOwner>`;
    }

    if (description) {
        xml += `
            <ComputerDescription>${description}</ComputerDescription>`;
    }

    xml += `
        </component>`;

    if (!joinDomain) {
        xml += `
        <component name="Microsoft-Windows-UnattendedJoin" processorArchitecture="${architecture}" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <Identification>
                <JoinWorkgroup>${workgroup}</JoinWorkgroup>
            </Identification>
        </component>`;
    } else if (domainName) {
        xml += `
        <component name="Microsoft-Windows-UnattendedJoin" processorArchitecture="${architecture}" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <Identification>
                <JoinDomain>${domainName}</JoinDomain>`;

        if (domainUsername && domainPassword) {
            xml += `
                <Credentials>
                    <Domain>${domainName}</Domain>
                    <Username>${domainUsername}</Username>
                    <Password>${btoa(domainPassword)}</Password>
                </Credentials>`;
        }

        xml += `
            </Identification>
        </component>`;
    }

    xml += `
    </settings>

    <!-- OOBE System Pass -->
    <settings pass="oobeSystem">
        <component name="Microsoft-Windows-Shell-Setup" processorArchitecture="${architecture}" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <OOBE>
                <HideEULAPage>${oobeHideEula}</HideEULAPage>
                <HideLocalAccountScreen>true</HideLocalAccountScreen>
                <HideOEMRegistrationScreen>${skipOem}</HideOEMRegistrationScreen>
                <HideOnlineAccountScreens>${oobeHideOnlineAccount}</HideOnlineAccountScreens>
                <HideWirelessSetupInOOBE>${oobeHideWireless}</HideWirelessSetupInOOBE>
                <NetworkLocation>Work</NetworkLocation>
                <ProtectYourPC>${oobeProtectPc ? '1' : '3'}</ProtectYourPC>
                <SkipMachineOOBE>${oobeSkipMachine}</SkipMachineOOBE>
                <SkipUserOOBE>${oobeSkipUser}</SkipUserOOBE>
            </OOBE>
            <UserAccounts>
                <AdministratorPassword>
                    <Value>${adminPassword ? btoa(adminPassword) : ''}</Value>
                    <PlainText>false</PlainText>
                </AdministratorPassword>`;

    if (userUsername) {
        xml += `
                <LocalAccounts>
                    <LocalAccount wcm:action="add">
                        <Password>
                            <Value>${userPassword ? btoa(userPassword) : ''}</Value>
                            <PlainText>false</PlainText>
                        </Password>
                        <Description>User Account</Description>
                        <DisplayName>${userUsername}</DisplayName>
                        <Group>Users</Group>
                        <Name>${userUsername}</Name>
                    </LocalAccount>
                </LocalAccounts>`;
    }

    xml += `
            </UserAccounts>`;

    if (autoLogon && userUsername) {
        xml += `
            <AutoLogon>
                <Password>
                    <Value>${userPassword ? btoa(userPassword) : ''}</Value>
                    <PlainText>false</PlainText>
                </Password>
                <Enabled>true</Enabled>
                <LogonCount>1</LogonCount>
                <Username>${userUsername}</Username>
            </AutoLogon>`;
    }

    xml += `
        </component>
    </settings>
</unattend>`;

    return xml;
}

/**
 * Validate XML content
 */
function validateXMLContent(xmlContent) {
    try {
        // Basic XML validation
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

        // Check for parsing errors
        const parseError = xmlDoc.getElementsByTagName('parsererror');
        if (parseError.length > 0) {
            throw new Error('Invalid XML structure: ' + parseError[0].textContent);
        }

        // Check for required elements
        const unattendElement = xmlDoc.getElementsByTagName('unattend')[0];
        if (!unattendElement) {
            throw new Error('Missing required <unattend> root element');
        }

        const settingsElements = xmlDoc.getElementsByTagName('settings');
        if (settingsElements.length === 0) {
            throw new Error('Missing required <settings> elements');
        }

        return true;
    } catch (error) {
        throw new Error('XML validation failed: ' + error.message);
    }
}

/**
 * Export unattend.xml file
 */
async function exportUnattendXML() {
    try {
        const exportBtn = document.getElementById('export-unattend');
        if (exportBtn) {
            exportBtn.classList.add('loading');
        }

        // Generate XML content
        const xmlContent = generateUnattendXML();

        // Validate XML content before export
        validateXMLContent(xmlContent);

        if (window.electronAPI && window.electronAPI.saveFileDialog) {
            // Show save dialog
            const result = await window.electronAPI.saveFileDialog({
                title: 'Save Windows Unattend File',
                defaultPath: 'unattend.xml',
                filters: [
                    { name: 'XML Files', extensions: ['xml'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            if (!result.canceled && result.filePath) {
                // Write file
                await window.electronAPI.writeFile(result.filePath, xmlContent);
                showStatusMessage('success', `Unattend.xml file saved successfully to: ${result.filePath}`);
            }
        } else {
            // Fallback for browser testing - download file
            const blob = new Blob([xmlContent], { type: 'application/xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'unattend.xml';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showStatusMessage('success', 'Unattend.xml file downloaded successfully');
        }

    } catch (error) {
        console.error('Error exporting unattend XML:', error);
        showStatusMessage('error', `Failed to export unattend.xml: ${error.message}`);
    } finally {
        const exportBtn = document.getElementById('export-unattend');
        if (exportBtn) {
            exportBtn.classList.remove('loading');
        }
    }
}

/**
 * Show XML preview modal
 */
function showXMLPreview() {
    try {
        const xmlContent = generateUnattendXML();
        const modal = document.getElementById('xml-preview-modal');
        const previewContent = document.getElementById('xml-preview-content');

        if (modal && previewContent) {
            previewContent.textContent = xmlContent;
            modal.style.display = 'flex';
        }
    } catch (error) {
        console.error('Error generating XML preview:', error);
        showStatusMessage('error', `Failed to generate XML preview: ${error.message}`);
    }
}

/**
 * Close XML preview modal
 */
function closeXMLPreview() {
    const modal = document.getElementById('xml-preview-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Copy XML content to clipboard
 */
async function copyXMLToClipboard() {
    try {
        const xmlContent = generateUnattendXML();

        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(xmlContent);
            showStatusMessage('success', 'XML content copied to clipboard');
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = xmlContent;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showStatusMessage('success', 'XML content copied to clipboard');
        }
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        showStatusMessage('error', 'Failed to copy XML to clipboard');
    }
}

/**
 * Reset form to default values
 */
function resetForm() {
    if (confirm('Are you sure you want to reset all settings to default values?')) {
        // Load the basic preset as default
        loadPreset('basic');
        showStatusMessage('info', 'Form has been reset to basic preset values');
    }
}

/**
 * Show status message to user
 * @param {string} type - Message type: 'success', 'error', 'warning', 'info'
 * @param {string} message - Message to display
 */
function showStatusMessage(type, message) {
    const statusElement = document.getElementById('status-message');
    if (!statusElement) return;

    // Clear existing classes and content
    statusElement.className = 'status-message';
    statusElement.classList.add(type);
    statusElement.textContent = message;
    statusElement.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 5000);
}

/**
 * Toggle domain settings visibility
 */
function toggleDomainSettings() {
    const joinDomain = document.getElementById('join-domain');
    const domainSettings = document.getElementById('domain-settings');

    if (joinDomain && domainSettings) {
        domainSettings.style.display = joinDomain.checked ? 'block' : 'none';
    }
}

/**
 * Validate form inputs
 */
function validateForm() {
    const adminPassword = document.getElementById('admin-password')?.value;
    const userUsername = document.getElementById('user-username')?.value;
    const userPassword = document.getElementById('user-password')?.value;
    const autoLogon = document.getElementById('auto-logon')?.checked;
    const computerName = document.getElementById('computer-name')?.value;
    const productKey = document.getElementById('product-key')?.value;

    // Check if auto-logon is enabled but user account is not set up
    if (autoLogon && (!userUsername || !userPassword)) {
        showStatusMessage('warning', 'Auto-logon requires a user account with username and password');
        return false;
    }

    // Validate product key format if provided
    if (productKey && productKey.trim()) {
        const productKeyPattern = /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/;
        if (!productKeyPattern.test(productKey.trim().toUpperCase())) {
            showStatusMessage('error', 'Product key must be in format: XXXXX-XXXXX-XXXXX-XXXXX-XXXXX');
            return false;
        }
    }

    // Validate computer name if provided
    if (computerName && computerName.trim()) {
        const computerNamePattern = /^[a-zA-Z0-9-]{1,15}$/;
        if (!computerNamePattern.test(computerName.trim())) {
            showStatusMessage('error', 'Computer name must be 1-15 characters and contain only letters, numbers, and hyphens');
            return false;
        }
    }

    // Validate username format if provided
    if (userUsername && userUsername.trim()) {
        const usernamePattern = /^[a-zA-Z0-9_-]{1,20}$/;
        if (!usernamePattern.test(userUsername.trim())) {
            showStatusMessage('error', 'Username must be 1-20 characters and contain only letters, numbers, underscores, and hyphens');
            return false;
        }
    }

    // Warn if no administrator password is set
    if (!adminPassword) {
        if (!confirm('No administrator password is set. This may create a security risk. Continue anyway?')) {
            return false;
        }
    }

    return true;
}

// Track initialization to prevent multiple calls
let isInitialized = false;

/**
 * Initialize the Windows Unattend tab
 */
function initWindowsUnattend() {
    if (isInitialized) {
        console.log('Windows Unattend tab already initialized, skipping...');
        return;
    }

    console.log('Initializing Windows Unattend tab');
    isInitialized = true;

    // Setup export button
    const exportBtn = document.getElementById('export-unattend');
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            if (validateForm()) {
                await exportUnattendXML();
            }
        });
    }

    // Setup preview button
    const previewBtn = document.getElementById('preview-xml');
    if (previewBtn) {
        previewBtn.addEventListener('click', showXMLPreview);
    }

    // Setup reset button
    const resetBtn = document.getElementById('reset-form');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetForm);
    }

    // Setup domain join toggle
    const joinDomainCheckbox = document.getElementById('join-domain');
    if (joinDomainCheckbox) {
        joinDomainCheckbox.addEventListener('change', toggleDomainSettings);
    }

    // Setup form validation on key inputs
    const criticalInputs = ['admin-password', 'user-username', 'user-password'];
    criticalInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('blur', () => {
                // Validate when user leaves the field
                const autoLogon = document.getElementById('auto-logon')?.checked;
                const userUsername = document.getElementById('user-username')?.value;
                const userPassword = document.getElementById('user-password')?.value;

                if (autoLogon && (!userUsername || !userPassword)) {
                    showStatusMessage('warning', 'Auto-logon requires both username and password');
                }
            });
        }
    });

    console.log('Windows Unattend tab initialized successfully');

    // Signal that this tab is ready
    if (window.markTabAsReady && typeof tabId !== 'undefined') {
        console.log('Marking windows-unattend tab as ready');
        window.markTabAsReady(tabId);
    }
}

// Make functions globally available
window.loadPreset = loadPreset;
window.exportUnattendXML = exportUnattendXML;
window.resetForm = resetForm;
window.showStatusMessage = showStatusMessage;
window.initWindowsUnattend = initWindowsUnattend;
window.generateUnattendXML = generateUnattendXML;
window.validateForm = validateForm;
window.validateXMLContent = validateXMLContent;
window.toggleDomainSettings = toggleDomainSettings;
window.showXMLPreview = showXMLPreview;
window.closeXMLPreview = closeXMLPreview;
window.copyXMLToClipboard = copyXMLToClipboard;

// Initialize when the tab is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWindowsUnattend);
} else {
    // Small delay to ensure DOM is fully ready
    setTimeout(initWindowsUnattend, 50);
}
