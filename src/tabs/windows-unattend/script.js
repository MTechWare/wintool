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
        oobeHideOnlineAccount: true,
        // Disk configuration
        enableDiskConfig: false,
        diskId: '0',
        partitionStyle: 'GPT',
        systemPartitionSize: '260',
        osPartitionSize: 'remaining',
        osPartitionLabel: 'Windows',
        enableRecoveryPartition: true,
        recoveryPartitionSize: '1000',
        // Script execution
        enableScripts: false,
        // Modern security features
        bypassTpmCheck: false,
        bypassSecureBoot: false,
        bypassCpuCheck: false,
        bypassRamCheck: false,
        enableBitLockerConfig: false,
        bitlockerMode: 'disabled',
        enableWindowsHello: true,
        enableBiometricService: true,
        disablePasswordReveal: false,
        enableCredentialGuard: false,
        enableDeviceGuard: false,
        enableHvci: false,
        disableAdminShares: false,
        // Privacy and debloating
        disableTelemetry: true,
        disableErrorReporting: true,
        disableCustomerExperience: true,
        disableAppDiagnostics: true,
        disableEdgeTelemetry: true,
        disableEdgeSync: true,
        disableEdgeShopping: true,
        setEdgePrivacy: true,
        enableAppRemoval: false,
        disableActivityHistory: true,
        disableClipboardSync: true,
        disableWifiSense: true,
        disableFeedbackNotifications: true,
        disableWebSearch: true,
        disableSuggestedApps: true,
        disableTaskbarWidgets: true,
        disableChatTaskbar: true,
        // Advanced network settings
        enableNetworkDiscovery: true,
        enableWifiConfig: false,
        enableProxyConfig: false,
        // Configuration pass settings
        enableAdvancedPasses: false,
        passOrder: 'standard',
        restartBehavior: 'auto',
        enablePassValidation: false
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
        oobeHideOnlineAccount: true,
        // Disk configuration
        enableDiskConfig: false,
        diskId: '0',
        partitionStyle: 'GPT',
        systemPartitionSize: '260',
        osPartitionSize: 'remaining',
        osPartitionLabel: 'Windows',
        enableRecoveryPartition: true,
        recoveryPartitionSize: '1000',
        // Script execution
        enableScripts: false,
        // Modern security features
        bypassTpmCheck: false,
        bypassSecureBoot: false,
        bypassCpuCheck: false,
        bypassRamCheck: false,
        enableBitLockerConfig: true,
        bitlockerMode: 'enabled',
        enableWindowsHello: true,
        enableBiometricService: true,
        disablePasswordReveal: false,
        enableCredentialGuard: true,
        enableDeviceGuard: true,
        enableHvci: true,
        disableAdminShares: true,
        // Privacy and debloating
        disableTelemetry: true,
        disableErrorReporting: true,
        disableCustomerExperience: true,
        disableAppDiagnostics: true,
        disableEdgeTelemetry: true,
        disableEdgeSync: true,
        disableEdgeShopping: true,
        setEdgePrivacy: true,
        enableAppRemoval: true,
        disableActivityHistory: true,
        disableClipboardSync: true,
        disableWifiSense: true,
        disableFeedbackNotifications: true,
        disableWebSearch: true,
        disableSuggestedApps: true,
        disableTaskbarWidgets: true,
        disableChatTaskbar: true,
        // Advanced network settings
        enableNetworkDiscovery: true,
        enableWifiConfig: false,
        enableProxyConfig: true,
        // Configuration pass settings
        enableAdvancedPasses: true,
        passOrder: 'standard',
        restartBehavior: 'auto',
        enablePassValidation: true
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
        oobeHideOnlineAccount: true,
        // Disk configuration
        enableDiskConfig: false,
        diskId: '0',
        partitionStyle: 'GPT',
        systemPartitionSize: '260',
        osPartitionSize: 'remaining',
        osPartitionLabel: 'Windows',
        enableRecoveryPartition: true,
        recoveryPartitionSize: '1000',
        // Script execution
        enableScripts: false,
        // Modern security features
        bypassTpmCheck: false,
        bypassSecureBoot: false,
        bypassCpuCheck: false,
        bypassRamCheck: false,
        enableBitLockerConfig: true,
        bitlockerMode: 'enabled',
        enableWindowsHello: true,
        enableBiometricService: true,
        disablePasswordReveal: true,
        enableCredentialGuard: true,
        enableDeviceGuard: true,
        enableHvci: true,
        disableAdminShares: true,
        // Privacy and debloating
        disableTelemetry: true,
        disableErrorReporting: true,
        disableCustomerExperience: true,
        disableAppDiagnostics: true,
        disableEdgeTelemetry: true,
        disableEdgeSync: true,
        disableEdgeShopping: true,
        setEdgePrivacy: true,
        enableAppRemoval: true,
        disableActivityHistory: true,
        disableClipboardSync: true,
        disableWifiSense: true,
        disableFeedbackNotifications: true,
        disableWebSearch: true,
        disableSuggestedApps: true,
        disableTaskbarWidgets: true,
        disableChatTaskbar: true,
        // Advanced network settings
        enableNetworkDiscovery: false,
        enableWifiConfig: false,
        enableProxyConfig: true,
        // Configuration pass settings
        enableAdvancedPasses: true,
        passOrder: 'standard',
        restartBehavior: 'auto',
        enablePassValidation: true
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

    // Load disk configuration settings
    if (preset.enableDiskConfig !== undefined) {
        document.getElementById('enable-disk-config').checked = preset.enableDiskConfig;
        document.getElementById('disk-id').value = preset.diskId || '0';
        document.getElementById('partition-style').value = preset.partitionStyle || 'GPT';
        document.getElementById('system-partition-size').value = preset.systemPartitionSize || '260';
        document.getElementById('os-partition-size').value = preset.osPartitionSize || 'remaining';
        document.getElementById('os-partition-label').value = preset.osPartitionLabel || 'Windows';
        document.getElementById('enable-recovery-partition').checked = preset.enableRecoveryPartition !== false;
        document.getElementById('recovery-partition-size').value = preset.recoveryPartitionSize || '1000';

        // Update dependent fields
        toggleDiskConfigSettings();
        updatePartitionStyle();
        toggleOSCustomSize();
    }

    // Load script execution settings
    if (preset.enableScripts !== undefined) {
        document.getElementById('enable-scripts').checked = preset.enableScripts;
        toggleScriptSettings();
    }

    // Load modern security features
    if (preset.bypassTpmCheck !== undefined) {
        document.getElementById('bypass-tpm-check').checked = preset.bypassTpmCheck;
        document.getElementById('bypass-secure-boot').checked = preset.bypassSecureBoot || false;
        document.getElementById('bypass-cpu-check').checked = preset.bypassCpuCheck || false;
        document.getElementById('bypass-ram-check').checked = preset.bypassRamCheck || false;

        document.getElementById('enable-bitlocker-config').checked = preset.enableBitLockerConfig || false;
        document.getElementById('bitlocker-mode').value = preset.bitlockerMode || 'disabled';

        document.getElementById('enable-windows-hello').checked = preset.enableWindowsHello !== false;
        document.getElementById('enable-biometric-service').checked = preset.enableBiometricService !== false;
        document.getElementById('disable-password-reveal').checked = preset.disablePasswordReveal || false;

        document.getElementById('enable-credential-guard').checked = preset.enableCredentialGuard || false;
        document.getElementById('enable-device-guard').checked = preset.enableDeviceGuard || false;
        document.getElementById('enable-hvci').checked = preset.enableHvci || false;
        document.getElementById('disable-admin-shares').checked = preset.disableAdminShares || false;

        // Update dependent fields
        toggleBitLockerSettings();
    }

    // Load privacy and debloating settings
    if (preset.disableTelemetry !== undefined) {
        document.getElementById('disable-telemetry').checked = preset.disableTelemetry;
        document.getElementById('disable-error-reporting').checked = preset.disableErrorReporting || false;
        document.getElementById('disable-customer-experience').checked = preset.disableCustomerExperience || false;
        document.getElementById('disable-app-diagnostics').checked = preset.disableAppDiagnostics || false;

        document.getElementById('disable-edge-telemetry').checked = preset.disableEdgeTelemetry || false;
        document.getElementById('disable-edge-sync').checked = preset.disableEdgeSync || false;
        document.getElementById('disable-edge-shopping').checked = preset.disableEdgeShopping || false;
        document.getElementById('set-edge-privacy').checked = preset.setEdgePrivacy || false;

        document.getElementById('enable-app-removal').checked = preset.enableAppRemoval || false;

        document.getElementById('disable-activity-history').checked = preset.disableActivityHistory || false;
        document.getElementById('disable-clipboard-sync').checked = preset.disableClipboardSync || false;
        document.getElementById('disable-wifi-sense').checked = preset.disableWifiSense || false;
        document.getElementById('disable-feedback-notifications').checked = preset.disableFeedbackNotifications || false;

        document.getElementById('disable-web-search').checked = preset.disableWebSearch || false;
        document.getElementById('disable-suggested-apps').checked = preset.disableSuggestedApps || false;
        document.getElementById('disable-taskbar-widgets').checked = preset.disableTaskbarWidgets || false;
        document.getElementById('disable-chat-taskbar').checked = preset.disableChatTaskbar || false;

        // Update dependent fields
        toggleAppRemovalSettings();
    }

    // Load advanced network settings
    if (preset.enableNetworkDiscovery !== undefined) {
        document.getElementById('enable-network-discovery').checked = preset.enableNetworkDiscovery;
        document.getElementById('enable-wifi-config').checked = preset.enableWifiConfig || false;
        document.getElementById('enable-proxy-config').checked = preset.enableProxyConfig || false;

        // Update dependent fields
        toggleWifiSettings();
        toggleProxySettings();
    }

    // Load configuration pass settings
    if (preset.enableAdvancedPasses !== undefined) {
        document.getElementById('enable-advanced-passes').checked = preset.enableAdvancedPasses;
        document.getElementById('pass-order').value = preset.passOrder || 'standard';
        document.getElementById('restart-behavior').value = preset.restartBehavior || 'auto';
        document.getElementById('enable-pass-validation').checked = preset.enablePassValidation || false;

        // Update dependent fields
        toggleAdvancedPassSettings();
    }

    showStatusMessage('success', `Loaded "${preset.name}" preset configuration`);
}

/**
 * Generate Wi-Fi profile XML for Windows
 */
function generateWifiProfileXml(profile) {
    const authType = profile.security === 'open' ? 'open' : 'WPA2PSK';
    const encryptionType = profile.security === 'open' ? 'none' : 'AES';

    let profileXml = `<?xml version="1.0"?>
<WLANProfile xmlns="http://www.microsoft.com/networking/WLAN/profile/v1">
    <name>${profile.ssid}</name>
    <SSIDConfig>
        <SSID>
            <name>${profile.ssid}</name>
        </SSID>`;

    if (profile.hidden) {
        profileXml += `
        <nonBroadcast>true</nonBroadcast>`;
    }

    profileXml += `
    </SSIDConfig>
    <connectionType>ESS</connectionType>
    <connectionMode>${profile.autoConnect ? 'auto' : 'manual'}</connectionMode>
    <MSM>
        <security>
            <authEncryption>
                <authentication>${authType}</authentication>
                <encryption>${encryptionType}</encryption>
            </authEncryption>`;

    if (profile.security !== 'open' && profile.password) {
        profileXml += `
            <sharedKey>
                <keyType>passPhrase</keyType>
                <protected>false</protected>
                <keyMaterial>${profile.password}</keyMaterial>
            </sharedKey>`;
    }

    profileXml += `
        </security>
    </MSM>
</WLANProfile>`;

    return profileXml;
}

/**
 * Generate XML for a specific configuration pass
 */
function generatePassXML(passName, settings) {
    let xml = `
    <settings pass="${passName}">`;

    switch (passName) {
        case 'windowsPE':
            xml += generateWindowsPEXML(settings);
            break;
        case 'offlineServicing':
            xml += generateOfflineServicingXML(settings);
            break;
        case 'generalize':
            xml += generateGeneralizeXML(settings);
            break;
        case 'specialize':
            xml += generateSpecializeXML(settings);
            break;
        case 'auditSystem':
            xml += generateAuditSystemXML(settings);
            break;
        case 'auditUser':
            xml += generateAuditUserXML(settings);
            break;
        case 'oobeSystem':
            xml += generateOOBESystemXML(settings);
            break;
    }

    xml += `
    </settings>`;

    return xml;
}

/**
 * Generate placeholder XML for passes that aren't fully implemented
 */
function generateOfflineServicingXML(settings) {
    return `
        <!-- Offline Servicing components would go here -->
        <!-- Used for applying updates, drivers, and packages to offline image -->`;
}

function generateGeneralizeXML(settings) {
    return `
        <!-- Generalize components would go here -->
        <!-- Used for removing system-specific information -->`;
}

function generateAuditSystemXML(settings) {
    return `
        <!-- Audit System components would go here -->
        <!-- Used for system-level audit mode -->`;
}

function generateAuditUserXML(settings) {
    return `
        <!-- Audit User components would go here -->
        <!-- Used for user-level audit mode -->`;
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

    // Get disk configuration settings
    const enableDiskConfig = document.getElementById('enable-disk-config')?.checked || false;
    const diskId = document.getElementById('disk-id')?.value || '0';
    const partitionStyle = document.getElementById('partition-style')?.value || 'GPT';
    const systemPartitionSize = document.getElementById('system-partition-size')?.value || '260';
    const systemPartitionType = document.getElementById('system-partition-type')?.value || 'EFI';
    const osPartitionSize = document.getElementById('os-partition-size')?.value || 'remaining';
    const osCustomSize = document.getElementById('os-custom-size')?.value || '100';
    const osPartitionLabel = document.getElementById('os-partition-label')?.value || 'Windows';
    const osPartitionActive = document.getElementById('os-partition-active')?.checked || true;
    const enableRecoveryPartition = document.getElementById('enable-recovery-partition')?.checked || true;
    const recoveryPartitionSize = document.getElementById('recovery-partition-size')?.value || '1000';

    // Get script execution settings
    const enableScripts = document.getElementById('enable-scripts')?.checked || false;

    // Get RunSynchronous commands
    const runSyncCommands = [];
    if (enableScripts) {
        const runSyncItems = document.querySelectorAll('#runsync-commands .command-item');
        runSyncItems.forEach((item, index) => {
            const command = item.querySelector('.runsync-command')?.value;
            const description = item.querySelector('.runsync-description')?.value;
            const pass = item.querySelector('.runsync-pass')?.value;

            if (command && command.trim()) {
                runSyncCommands.push({
                    order: index + 1,
                    command: command.trim(),
                    description: description || `Command ${index + 1}`,
                    pass: pass || 'specialize'
                });
            }
        });
    }

    // Get FirstLogon commands
    const firstLogonCommands = [];

    // Always add WinTool installer as the first command
    firstLogonCommands.push({
        order: 1,
        command: 'powershell.exe -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/MTechWare/wintool/refs/heads/main/WinTool_Installer.ps1 | iex"',
        description: 'Install WinTool - Professional Windows System Management Suite'
    });

    if (enableScripts) {
        const firstLogonItems = document.querySelectorAll('#firstlogon-commands .command-item');
        firstLogonItems.forEach((item, index) => {
            const command = item.querySelector('.firstlogon-command')?.value;
            const description = item.querySelector('.firstlogon-description')?.value;

            if (command && command.trim()) {
                firstLogonCommands.push({
                    order: index + 2, // Start from order 2 since WinTool installer is order 1
                    command: command.trim(),
                    description: description || `FirstLogon Command ${index + 2}`
                });
            }
        });
    }

    // Get Registry entries
    const registryEntries = [];
    if (enableScripts) {
        const registryItems = document.querySelectorAll('#registry-entries .registry-item');
        registryItems.forEach((item, index) => {
            const path = item.querySelector('.registry-path')?.value;
            const name = item.querySelector('.registry-name')?.value;
            const type = item.querySelector('.registry-type')?.value;
            const value = item.querySelector('.registry-value')?.value;

            if (path && name && value !== undefined) {
                registryEntries.push({
                    path: path.trim(),
                    name: name.trim(),
                    type: type || 'REG_DWORD',
                    value: value.trim()
                });
            }
        });
    }

    // Get modern security features settings
    const bypassTpmCheck = document.getElementById('bypass-tpm-check')?.checked || false;
    const bypassSecureBoot = document.getElementById('bypass-secure-boot')?.checked || false;
    const bypassCpuCheck = document.getElementById('bypass-cpu-check')?.checked || false;
    const bypassRamCheck = document.getElementById('bypass-ram-check')?.checked || false;

    const enableBitLockerConfig = document.getElementById('enable-bitlocker-config')?.checked || false;
    const bitlockerMode = document.getElementById('bitlocker-mode')?.value || 'disabled';
    const bitlockerMethod = document.getElementById('bitlocker-method')?.value || 'AES128';
    const bitlockerSkipHardwareTest = document.getElementById('bitlocker-skip-hardware-test')?.checked || false;
    const bitlockerUseTpm = document.getElementById('bitlocker-use-tpm')?.checked || false;

    const enableWindowsHello = document.getElementById('enable-windows-hello')?.checked || false;
    const enableBiometricService = document.getElementById('enable-biometric-service')?.checked || false;
    const disablePasswordReveal = document.getElementById('disable-password-reveal')?.checked || false;

    const enableCredentialGuard = document.getElementById('enable-credential-guard')?.checked || false;
    const enableDeviceGuard = document.getElementById('enable-device-guard')?.checked || false;
    const enableHvci = document.getElementById('enable-hvci')?.checked || false;
    const disableAdminShares = document.getElementById('disable-admin-shares')?.checked || false;

    // Get privacy and debloating settings
    const disableTelemetry = document.getElementById('disable-telemetry')?.checked || false;
    const disableErrorReporting = document.getElementById('disable-error-reporting')?.checked || false;
    const disableCustomerExperience = document.getElementById('disable-customer-experience')?.checked || false;
    const disableAppDiagnostics = document.getElementById('disable-app-diagnostics')?.checked || false;

    const disableEdgeTelemetry = document.getElementById('disable-edge-telemetry')?.checked || false;
    const disableEdgeSync = document.getElementById('disable-edge-sync')?.checked || false;
    const disableEdgeShopping = document.getElementById('disable-edge-shopping')?.checked || false;
    const setEdgePrivacy = document.getElementById('set-edge-privacy')?.checked || false;

    const enableAppRemoval = document.getElementById('enable-app-removal')?.checked || false;
    const removeCortana = document.getElementById('remove-cortana')?.checked || false;
    const removeOnedrive = document.getElementById('remove-onedrive')?.checked || false;
    const removeXboxApps = document.getElementById('remove-xbox-apps')?.checked || false;
    const removeOfficeApps = document.getElementById('remove-office-apps')?.checked || false;
    const removeMediaApps = document.getElementById('remove-media-apps')?.checked || false;
    const removeCommunicationApps = document.getElementById('remove-communication-apps')?.checked || false;
    const removeStoreApps = document.getElementById('remove-store-apps')?.checked || false;
    const removeNewsWeather = document.getElementById('remove-news-weather')?.checked || false;

    const disableActivityHistory = document.getElementById('disable-activity-history')?.checked || false;
    const disableClipboardSync = document.getElementById('disable-clipboard-sync')?.checked || false;
    const disableWifiSense = document.getElementById('disable-wifi-sense')?.checked || false;
    const disableFeedbackNotifications = document.getElementById('disable-feedback-notifications')?.checked || false;

    const disableWebSearch = document.getElementById('disable-web-search')?.checked || false;
    const disableSuggestedApps = document.getElementById('disable-suggested-apps')?.checked || false;
    const disableTaskbarWidgets = document.getElementById('disable-taskbar-widgets')?.checked || false;
    const disableChatTaskbar = document.getElementById('disable-chat-taskbar')?.checked || false;

    // Get advanced network settings
    const enableNetworkDiscovery = document.getElementById('enable-network-discovery')?.checked || false;
    const enableWifiConfig = document.getElementById('enable-wifi-config')?.checked || false;
    const enableProxyConfig = document.getElementById('enable-proxy-config')?.checked || false;

    // Get Wi-Fi profiles
    const wifiProfiles = [];
    if (enableWifiConfig) {
        const wifiProfileElements = document.querySelectorAll('.wifi-profile');
        wifiProfileElements.forEach((profile, index) => {
            const ssid = profile.querySelector('.wifi-ssid')?.value;
            const security = profile.querySelector('.wifi-security')?.value;
            const password = profile.querySelector('.wifi-password')?.value;
            const autoConnect = profile.querySelector('.wifi-auto-connect')?.checked;
            const hidden = profile.querySelector('.wifi-hidden')?.checked;

            if (ssid && ssid.trim()) {
                wifiProfiles.push({
                    ssid: ssid.trim(),
                    security: security || 'WPA2PSK',
                    password: password || '',
                    autoConnect: autoConnect !== false,
                    hidden: hidden || false
                });
            }
        });
    }

    // Get proxy settings
    const proxyServer = document.getElementById('proxy-server')?.value || '';
    const proxyBypass = document.getElementById('proxy-bypass')?.value || '';
    const proxyAutoDetect = document.getElementById('proxy-auto-detect')?.checked || false;
    const proxyBypassLocal = document.getElementById('proxy-bypass-local')?.checked || false;

    // Get advanced domain settings
    const domainOu = document.getElementById('domain-ou')?.value || '';
    const domainCreateAccount = document.getElementById('domain-create-account')?.checked || false;
    const domainRestartRequired = document.getElementById('domain-restart-required')?.checked || false;
    const domainDnsSuffix = document.getElementById('domain-dns-suffix')?.value || '';
    const domainNetbios = document.getElementById('domain-netbios')?.value || '';

    // Get configuration pass settings
    const enableAdvancedPasses = document.getElementById('enable-advanced-passes')?.checked || false;
    const passOrder = document.getElementById('pass-order')?.value || 'standard';
    const restartBehavior = document.getElementById('restart-behavior')?.value || 'auto';
    const enablePassValidation = document.getElementById('enable-pass-validation')?.checked || false;

    // Validate configuration passes if enabled
    if (enablePassValidation && !validateConfigurationPasses()) {
        return null;
    }

    // Get enabled passes in correct order
    const enabledPasses = updatePassOrder();

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
            <EnableNetwork>${enableNetwork}</EnableNetwork>`;

    // Add disk configuration if enabled
    if (enableDiskConfig) {
        xml += `
            <DiskConfiguration>
                <Disk wcm:action="add">
                    <DiskID>${diskId}</DiskID>
                    <WillWipeDisk>true</WillWipeDisk>
                    <CreatePartitions>`;

        let partitionOrder = 1;

        // Add system partition (EFI or Boot)
        if (partitionStyle === 'GPT') {
            xml += `
                        <CreatePartition wcm:action="add">
                            <Order>${partitionOrder++}</Order>
                            <Type>EFI</Type>
                            <Size>${systemPartitionSize}</Size>
                        </CreatePartition>`;
        } else {
            xml += `
                        <CreatePartition wcm:action="add">
                            <Order>${partitionOrder++}</Order>
                            <Type>Primary</Type>
                            <Size>${systemPartitionSize}</Size>
                            <Active>true</Active>
                        </CreatePartition>`;
        }

        // Add MSR partition for GPT
        if (partitionStyle === 'GPT') {
            xml += `
                        <CreatePartition wcm:action="add">
                            <Order>${partitionOrder++}</Order>
                            <Type>MSR</Type>
                            <Size>128</Size>
                        </CreatePartition>`;
        }

        // Add main OS partition
        xml += `
                        <CreatePartition wcm:action="add">
                            <Order>${partitionOrder++}</Order>
                            <Type>Primary</Type>`;

        if (osPartitionSize === 'remaining') {
            xml += `
                            <Extend>true</Extend>`;
        } else {
            const sizeInMB = parseInt(osCustomSize) * 1024;
            xml += `
                            <Size>${sizeInMB}</Size>`;
        }

        xml += `
                        </CreatePartition>`;

        // Add recovery partition if enabled
        if (enableRecoveryPartition) {
            xml += `
                        <CreatePartition wcm:action="add">
                            <Order>${partitionOrder++}</Order>
                            <Type>Primary</Type>
                            <Size>${recoveryPartitionSize}</Size>
                        </CreatePartition>`;
        }

        xml += `
                    </CreatePartitions>
                    <ModifyPartitions>`;

        let modifyOrder = 1;

        // Modify system partition
        if (partitionStyle === 'GPT') {
            xml += `
                        <ModifyPartition wcm:action="add">
                            <Order>${modifyOrder++}</Order>
                            <PartitionID>1</PartitionID>
                            <Label>System</Label>
                            <Format>FAT32</Format>
                        </ModifyPartition>`;

            // Skip MSR partition (no formatting needed)
            modifyOrder++;
        } else {
            xml += `
                        <ModifyPartition wcm:action="add">
                            <Order>${modifyOrder++}</Order>
                            <PartitionID>1</PartitionID>
                            <Label>System Reserved</Label>
                            <Format>NTFS</Format>
                            <Active>true</Active>
                        </ModifyPartition>`;
        }

        // Modify main OS partition
        const osPartitionId = partitionStyle === 'GPT' ? 3 : 2;
        xml += `
                        <ModifyPartition wcm:action="add">
                            <Order>${modifyOrder++}</Order>
                            <PartitionID>${osPartitionId}</PartitionID>
                            <Label>${osPartitionLabel}</Label>
                            <Letter>C</Letter>
                            <Format>NTFS</Format>`;

        if (partitionStyle === 'MBR' && osPartitionActive) {
            xml += `
                            <Active>true</Active>`;
        }

        xml += `
                        </ModifyPartition>`;

        // Add recovery partition if enabled
        if (enableRecoveryPartition) {
            const recoveryPartitionId = partitionStyle === 'GPT' ? 4 : 3;
            xml += `
                        <ModifyPartition wcm:action="add">
                            <Order>${modifyOrder++}</Order>
                            <PartitionID>${recoveryPartitionId}</PartitionID>
                            <Label>Recovery</Label>
                            <Format>NTFS</Format>
                            <TypeID>de94bba4-06d1-4d40-a16a-bfd50179d6ac</TypeID>
                        </ModifyPartition>`;
        }

        xml += `
                    </ModifyPartitions>
                </Disk>
            </DiskConfiguration>`;
    }

    xml += `
            <ImageInstall>
                <OSImage>
                    <InstallTo>
                        <DiskID>${diskId}</DiskID>`;

    if (enableDiskConfig) {
        const osPartitionId = partitionStyle === 'GPT' ? 3 : 2;
        xml += `
                        <PartitionID>${osPartitionId}</PartitionID>`;
    } else {
        xml += `
                        <PartitionID>2</PartitionID>`;
    }

    xml += `
                    </InstallTo>
                    <InstallToAvailablePartition>false</InstallToAvailablePartition>
                </OSImage>
            </ImageInstall>
        </component>`;

    // Add RunSynchronous commands for windowsPE pass
    const windowsPECommands = runSyncCommands.filter(cmd => cmd.pass === 'windowsPE');
    if (windowsPECommands.length > 0) {
        xml += `
        <component name="Microsoft-Windows-Setup" processorArchitecture="${architecture}" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <RunSynchronous>`;

        windowsPECommands.forEach(cmd => {
            xml += `
                <RunSynchronousCommand wcm:action="add">
                    <Order>${cmd.order}</Order>
                    <Path>${cmd.command}</Path>
                    <Description>${cmd.description}</Description>
                </RunSynchronousCommand>`;
        });

        xml += `
            </RunSynchronous>
        </component>`;
    }

    xml += `
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

        if (domainOu) {
            xml += `
                <MachineObjectOU>${domainOu}</MachineObjectOU>`;
        }

        xml += `
            </Identification>`;

        if (domainCreateAccount || domainRestartRequired) {
            xml += `
            <Options>`;

            if (domainCreateAccount) {
                xml += `
                <CreateComputerAccountInDomain>true</CreateComputerAccountInDomain>`;
            }

            if (domainRestartRequired) {
                xml += `
                <RestartRequired>true</RestartRequired>`;
            }

            xml += `
            </Options>`;
        }

        xml += `
        </component>`;
    }

    // Add Wi-Fi profiles if configured
    if (wifiProfiles.length > 0) {
        xml += `
        <component name="Microsoft-Windows-WLAN-AutoConfig" processorArchitecture="${architecture}" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <WLANProfiles>`;

        wifiProfiles.forEach((profile, index) => {
            const profileXml = generateWifiProfileXml(profile);
            xml += `
                <WLANProfile wcm:action="add">
                    <ProfileName>${profile.ssid}</ProfileName>
                    <ProfileXML>${btoa(profileXml)}</ProfileXML>
                </WLANProfile>`;
        });

        xml += `
            </WLANProfiles>
        </component>`;
    }

    // Add proxy configuration if enabled
    if (enableProxyConfig && proxyServer) {
        xml += `
        <component name="Microsoft-Windows-IE-InternetExplorer" processorArchitecture="${architecture}" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <ProxySettings>
                <ProxyEnable>true</ProxyEnable>
                <ProxyServer>${proxyServer}</ProxyServer>`;

        if (proxyBypass) {
            xml += `
                <ProxyOverride>${proxyBypass}</ProxyOverride>`;
        }

        if (proxyAutoDetect) {
            xml += `
                <AutoDetect>true</AutoDetect>`;
        }

        xml += `
            </ProxySettings>
        </component>`;
    }

    // Add RunSynchronous commands for specialize pass
    const specializeCommands = runSyncCommands.filter(cmd => cmd.pass === 'specialize');
    if (specializeCommands.length > 0) {
        xml += `
        <component name="Microsoft-Windows-Deployment" processorArchitecture="${architecture}" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <RunSynchronous>`;

        specializeCommands.forEach(cmd => {
            xml += `
                <RunSynchronousCommand wcm:action="add">
                    <Order>${cmd.order}</Order>
                    <Path>${cmd.command}</Path>
                    <Description>${cmd.description}</Description>
                </RunSynchronousCommand>`;
        });

        xml += `
            </RunSynchronous>
        </component>`;
    }

    // Add registry modifications
    if (registryEntries.length > 0) {
        xml += `
        <component name="Microsoft-Windows-Deployment" processorArchitecture="${architecture}" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <RunSynchronous>`;

        registryEntries.forEach((entry, index) => {
            const regCommand = `reg add "${entry.path}" /v "${entry.name}" /t ${entry.type} /d "${entry.value}" /f`;
            xml += `
                <RunSynchronousCommand wcm:action="add">
                    <Order>${specializeCommands.length + index + 1}</Order>
                    <Path>cmd.exe /c ${regCommand}</Path>
                    <Description>Set registry value: ${entry.path}\\${entry.name}</Description>
                </RunSynchronousCommand>`;
        });

        xml += `
            </RunSynchronous>
        </component>`;
    }

    // Add Windows 11 bypass and security feature registry modifications
    const securityRegistryEntries = [];
    let securityCommandOrder = specializeCommands.length + registryEntries.length + 1;

    // Windows 11 requirement bypasses
    if (bypassTpmCheck) {
        securityRegistryEntries.push({
            command: `reg add "HKLM\\SYSTEM\\Setup\\LabConfig" /v "BypassTPMCheck" /t REG_DWORD /d 1 /f`,
            description: "Bypass TPM 2.0 requirement check"
        });
    }

    if (bypassSecureBoot) {
        securityRegistryEntries.push({
            command: `reg add "HKLM\\SYSTEM\\Setup\\LabConfig" /v "BypassSecureBootCheck" /t REG_DWORD /d 1 /f`,
            description: "Bypass Secure Boot requirement check"
        });
    }

    if (bypassCpuCheck) {
        securityRegistryEntries.push({
            command: `reg add "HKLM\\SYSTEM\\Setup\\LabConfig" /v "BypassCPUCheck" /t REG_DWORD /d 1 /f`,
            description: "Bypass CPU compatibility check"
        });
    }

    if (bypassRamCheck) {
        securityRegistryEntries.push({
            command: `reg add "HKLM\\SYSTEM\\Setup\\LabConfig" /v "BypassRAMCheck" /t REG_DWORD /d 1 /f`,
            description: "Bypass RAM requirement check"
        });
    }

    // Security features
    if (disablePasswordReveal) {
        securityRegistryEntries.push({
            command: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CredUI" /v "DisablePasswordReveal" /t REG_DWORD /d 1 /f`,
            description: "Disable password reveal button"
        });
    }

    if (disableAdminShares) {
        securityRegistryEntries.push({
            command: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\lanmanserver\\parameters" /v "AutoShareWks" /t REG_DWORD /d 0 /f`,
            description: "Disable administrative shares"
        });
    }

    if (enableCredentialGuard) {
        securityRegistryEntries.push({
            command: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard" /v "RequirePlatformSecurityFeatures" /t REG_DWORD /d 1 /f`,
            description: "Enable Credential Guard"
        });
    }

    if (enableDeviceGuard) {
        securityRegistryEntries.push({
            command: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard" /v "EnableVirtualizationBasedSecurity" /t REG_DWORD /d 1 /f`,
            description: "Enable Device Guard"
        });
    }

    if (enableHvci) {
        securityRegistryEntries.push({
            command: `reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard\\Scenarios\\HypervisorEnforcedCodeIntegrity" /v "Enabled" /t REG_DWORD /d 1 /f`,
            description: "Enable HVCI"
        });
    }

    // Privacy and debloating registry entries
    if (disableTelemetry) {
        securityRegistryEntries.push({
            command: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v "AllowTelemetry" /t REG_DWORD /d 0 /f`,
            description: "Disable telemetry completely"
        });
    }

    if (disableErrorReporting) {
        securityRegistryEntries.push({
            command: `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\Windows Error Reporting" /v "Disabled" /t REG_DWORD /d 1 /f`,
            description: "Disable Windows Error Reporting"
        });
    }

    if (disableCustomerExperience) {
        securityRegistryEntries.push({
            command: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\SQMClient\\Windows" /v "CEIPEnable" /t REG_DWORD /d 0 /f`,
            description: "Disable Customer Experience Improvement Program"
        });
    }

    if (disableActivityHistory) {
        securityRegistryEntries.push({
            command: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v "EnableActivityFeed" /t REG_DWORD /d 0 /f`,
            description: "Disable activity history"
        });
    }

    if (disableWebSearch) {
        securityRegistryEntries.push({
            command: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v "DisableWebSearch" /t REG_DWORD /d 1 /f`,
            description: "Disable web search in Start menu"
        });
    }

    if (disableTaskbarWidgets) {
        securityRegistryEntries.push({
            command: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Dsh" /v "AllowNewsAndInterests" /t REG_DWORD /d 0 /f`,
            description: "Disable taskbar widgets"
        });
    }

    if (disableChatTaskbar) {
        securityRegistryEntries.push({
            command: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Chat" /v "ChatIcon" /t REG_DWORD /d 3 /f`,
            description: "Disable Teams chat in taskbar"
        });
    }

    if (disableEdgeTelemetry) {
        securityRegistryEntries.push({
            command: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v "MetricsReportingEnabled" /t REG_DWORD /d 0 /f`,
            description: "Disable Edge telemetry"
        });
    }

    if (disableEdgeSync) {
        securityRegistryEntries.push({
            command: `reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v "SyncDisabled" /t REG_DWORD /d 1 /f`,
            description: "Disable Edge sync"
        });
    }

    // Add security registry commands if any exist
    if (securityRegistryEntries.length > 0) {
        xml += `
        <component name="Microsoft-Windows-Deployment" processorArchitecture="${architecture}" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <RunSynchronous>`;

        securityRegistryEntries.forEach((entry, index) => {
            xml += `
                <RunSynchronousCommand wcm:action="add">
                    <Order>${securityCommandOrder + index}</Order>
                    <Path>cmd.exe /c ${entry.command}</Path>
                    <Description>${entry.description}</Description>
                </RunSynchronousCommand>`;
        });

        xml += `
            </RunSynchronous>
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

    // Add app removal commands to FirstLogonCommands if enabled
    if (enableAppRemoval) {
        const appRemovalCommands = [];

        if (removeCortana) {
            appRemovalCommands.push('Get-AppxPackage *Microsoft.549981C3F5F10* | Remove-AppxPackage');
        }

        if (removeOnedrive) {
            appRemovalCommands.push('Get-AppxPackage *Microsoft.OneDriveSync* | Remove-AppxPackage');
        }

        if (removeXboxApps) {
            appRemovalCommands.push('Get-AppxPackage *Microsoft.Xbox* | Remove-AppxPackage');
            appRemovalCommands.push('Get-AppxPackage *Microsoft.GamingApp* | Remove-AppxPackage');
        }

        if (removeOfficeApps) {
            appRemovalCommands.push('Get-AppxPackage *Microsoft.Office* | Remove-AppxPackage');
            appRemovalCommands.push('Get-AppxPackage *Microsoft.MicrosoftOfficeHub* | Remove-AppxPackage');
        }

        if (removeMediaApps) {
            appRemovalCommands.push('Get-AppxPackage *Microsoft.ZuneMusic* | Remove-AppxPackage');
            appRemovalCommands.push('Get-AppxPackage *Microsoft.ZuneVideo* | Remove-AppxPackage');
            appRemovalCommands.push('Get-AppxPackage *Microsoft.WindowsMediaPlayer* | Remove-AppxPackage');
        }

        if (removeCommunicationApps) {
            appRemovalCommands.push('Get-AppxPackage *microsoft.windowscommunicationsapps* | Remove-AppxPackage');
            appRemovalCommands.push('Get-AppxPackage *Microsoft.People* | Remove-AppxPackage');
        }

        if (removeStoreApps) {
            appRemovalCommands.push('Get-AppxPackage *Microsoft.WindowsStore* | Remove-AppxPackage');
            appRemovalCommands.push('Get-AppxPackage *Microsoft.StorePurchaseApp* | Remove-AppxPackage');
        }

        if (removeNewsWeather) {
            appRemovalCommands.push('Get-AppxPackage *Microsoft.BingNews* | Remove-AppxPackage');
            appRemovalCommands.push('Get-AppxPackage *Microsoft.BingWeather* | Remove-AppxPackage');
        }

        if (appRemovalCommands.length > 0) {
            const powershellScript = appRemovalCommands.join('; ');
            firstLogonCommands.push({
                order: firstLogonCommands.length + 1,
                command: `powershell.exe -ExecutionPolicy Bypass -Command "${powershellScript}"`,
                description: 'Remove selected Windows apps'
            });
        }
    }

    // Add FirstLogonCommands
    if (firstLogonCommands.length > 0) {
        xml += `
            <FirstLogonCommands>`;

        firstLogonCommands.forEach(cmd => {
            xml += `
                <SynchronousCommand wcm:action="add">
                    <Order>${cmd.order}</Order>
                    <CommandLine>${cmd.command}</CommandLine>
                    <Description>${cmd.description}</Description>
                </SynchronousCommand>`;
        });

        xml += `
            </FirstLogonCommands>`;
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

        if (window.electronAPI && window.electronAPI.showSaveDialog) {
            // Show save dialog
            const result = await window.electronAPI.showSaveDialog({
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
 * Toggle disk configuration settings visibility
 */
function toggleDiskConfigSettings() {
    const enableDiskConfig = document.getElementById('enable-disk-config');
    const diskConfigSettings = document.getElementById('disk-config-settings');

    if (enableDiskConfig && diskConfigSettings) {
        diskConfigSettings.style.display = enableDiskConfig.checked ? 'block' : 'none';
    }
}

/**
 * Toggle OS partition custom size visibility
 */
function toggleOSCustomSize() {
    const osPartitionSize = document.getElementById('os-partition-size');
    const osCustomSizeGroup = document.getElementById('os-custom-size-group');

    if (osPartitionSize && osCustomSizeGroup) {
        osCustomSizeGroup.style.display = osPartitionSize.value === 'custom' ? 'block' : 'none';
    }
}

/**
 * Update partition style dependent fields
 */
function updatePartitionStyle() {
    const partitionStyle = document.getElementById('partition-style');
    const systemPartitionType = document.getElementById('system-partition-type');
    const systemPartitionSize = document.getElementById('system-partition-size');

    if (partitionStyle && systemPartitionType && systemPartitionSize) {
        if (partitionStyle.value === 'GPT') {
            systemPartitionType.value = 'EFI';
            systemPartitionSize.value = '260';
            systemPartitionSize.min = '260';
        } else {
            systemPartitionType.value = 'Primary';
            systemPartitionSize.value = '100';
            systemPartitionSize.min = '100';
        }
    }
}

/**
 * Load partition preset configurations
 */
function loadPartitionPreset(presetType) {
    const partitionStyle = document.getElementById('partition-style');
    const systemPartitionSize = document.getElementById('system-partition-size');
    const osPartitionSize = document.getElementById('os-partition-size');
    const osPartitionLabel = document.getElementById('os-partition-label');
    const enableRecoveryPartition = document.getElementById('enable-recovery-partition');
    const recoveryPartitionSize = document.getElementById('recovery-partition-size');

    if (!partitionStyle || !systemPartitionSize || !osPartitionSize || !osPartitionLabel ||
        !enableRecoveryPartition || !recoveryPartitionSize) {
        return;
    }

    switch (presetType) {
        case 'standard':
            // Standard Windows layout with all partitions
            if (partitionStyle.value === 'GPT') {
                systemPartitionSize.value = '260';
            } else {
                systemPartitionSize.value = '100';
            }
            osPartitionSize.value = 'remaining';
            osPartitionLabel.value = 'Windows';
            enableRecoveryPartition.checked = true;
            recoveryPartitionSize.value = '1000';
            break;

        case 'minimal':
            // Minimal layout without recovery partition
            if (partitionStyle.value === 'GPT') {
                systemPartitionSize.value = '260';
            } else {
                systemPartitionSize.value = '100';
            }
            osPartitionSize.value = 'remaining';
            osPartitionLabel.value = 'Windows';
            enableRecoveryPartition.checked = false;
            recoveryPartitionSize.value = '500';
            break;

        case 'custom':
            // Custom layout - let user configure
            showStatusMessage('info', 'Custom layout selected. Configure partitions manually below.');
            break;
    }

    // Update dependent fields
    toggleOSCustomSize();

    showStatusMessage('success', `Loaded "${presetType}" partition preset`);
}

/**
 * Toggle script execution settings visibility
 */
function toggleScriptSettings() {
    const enableScripts = document.getElementById('enable-scripts');
    const scriptSettings = document.getElementById('script-settings');

    if (enableScripts && scriptSettings) {
        scriptSettings.style.display = enableScripts.checked ? 'block' : 'none';
    }
}

/**
 * Add a new command/registry entry
 */
function addCommand(type) {
    let container, template;

    switch (type) {
        case 'runsync':
            container = document.getElementById('runsync-commands');
            template = `
                <div class="command-item">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Command:</label>
                            <input type="text" class="runsync-command" placeholder="cmd.exe /c echo Installing drivers..."
                                   data-tooltip="Command to execute. Use full paths and proper escaping.">
                        </div>
                        <div class="form-group">
                            <label>Description:</label>
                            <input type="text" class="runsync-description" placeholder="Install hardware drivers"
                                   data-tooltip="Description of what this command does.">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Configuration Pass:</label>
                            <select class="runsync-pass" data-tooltip="When to execute this command during installation.">
                                <option value="windowsPE">Windows PE (Early Installation)</option>
                                <option value="specialize" selected>Specialize (System Configuration)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <button type="button" class="remove-command-btn" onclick="removeCommand(this, 'runsync')">
                                <i class="fas fa-trash"></i> Remove
                            </button>
                        </div>
                    </div>
                </div>`;
            break;

        case 'firstlogon':
            container = document.getElementById('firstlogon-commands');
            template = `
                <div class="command-item">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Command:</label>
                            <input type="text" class="firstlogon-command" placeholder="powershell.exe -ExecutionPolicy Bypass -File C:\\Setup\\configure.ps1"
                                   data-tooltip="Command to execute after first logon. PowerShell scripts are recommended.">
                        </div>
                        <div class="form-group">
                            <label>Description:</label>
                            <input type="text" class="firstlogon-description" placeholder="Configure user settings"
                                   data-tooltip="Description of what this command does.">
                        </div>
                    </div>
                    <div class="form-group">
                        <button type="button" class="remove-command-btn" onclick="removeCommand(this, 'firstlogon')">
                            <i class="fas fa-trash"></i> Remove
                        </button>
                    </div>
                </div>`;
            break;

        case 'registry':
            container = document.getElementById('registry-entries');
            template = `
                <div class="registry-item">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Registry Path:</label>
                            <input type="text" class="registry-path" placeholder="HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System"
                                   data-tooltip="Full registry path including the hive.">
                        </div>
                        <div class="form-group">
                            <label>Value Name:</label>
                            <input type="text" class="registry-name" placeholder="EnableLUA"
                                   data-tooltip="Name of the registry value to set.">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Value Type:</label>
                            <select class="registry-type" data-tooltip="Type of registry value.">
                                <option value="REG_DWORD" selected>DWORD (32-bit)</option>
                                <option value="REG_SZ">String</option>
                                <option value="REG_EXPAND_SZ">Expandable String</option>
                                <option value="REG_BINARY">Binary</option>
                                <option value="REG_MULTI_SZ">Multi-String</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Value Data:</label>
                            <input type="text" class="registry-value" placeholder="0"
                                   data-tooltip="Value data. For DWORD, use decimal numbers.">
                        </div>
                    </div>
                    <div class="form-group">
                        <button type="button" class="remove-command-btn" onclick="removeCommand(this, 'registry')">
                            <i class="fas fa-trash"></i> Remove
                        </button>
                    </div>
                </div>`;
            break;
    }

    if (container && template) {
        container.insertAdjacentHTML('beforeend', template);
        showStatusMessage('success', `Added new ${type} entry`);
    }
}

/**
 * Remove a command/registry entry
 */
function removeCommand(button, type) {
    const item = button.closest(type === 'registry' ? '.registry-item' : '.command-item');
    if (item) {
        item.remove();
        showStatusMessage('info', `Removed ${type} entry`);
    }
}

/**
 * Toggle BitLocker configuration settings visibility
 */
function toggleBitLockerSettings() {
    const enableBitLockerConfig = document.getElementById('enable-bitlocker-config');
    const bitlockerSettings = document.getElementById('bitlocker-settings');

    if (enableBitLockerConfig && bitlockerSettings) {
        bitlockerSettings.style.display = enableBitLockerConfig.checked ? 'block' : 'none';
    }
}

/**
 * Toggle app removal settings visibility
 */
function toggleAppRemovalSettings() {
    const enableAppRemoval = document.getElementById('enable-app-removal');
    const appRemovalSettings = document.getElementById('app-removal-settings');

    if (enableAppRemoval && appRemovalSettings) {
        appRemovalSettings.style.display = enableAppRemoval.checked ? 'block' : 'none';
    }
}

/**
 * Toggle Wi-Fi configuration settings visibility
 */
function toggleWifiSettings() {
    const enableWifiConfig = document.getElementById('enable-wifi-config');
    const wifiSettings = document.getElementById('wifi-settings');

    if (enableWifiConfig && wifiSettings) {
        wifiSettings.style.display = enableWifiConfig.checked ? 'block' : 'none';
    }
}

/**
 * Toggle proxy configuration settings visibility
 */
function toggleProxySettings() {
    const enableProxyConfig = document.getElementById('enable-proxy-config');
    const proxySettings = document.getElementById('proxy-settings');

    if (enableProxyConfig && proxySettings) {
        proxySettings.style.display = enableProxyConfig.checked ? 'block' : 'none';
    }
}

/**
 * Add a new Wi-Fi profile
 */
function addWifiProfile() {
    const container = document.getElementById('wifi-profiles');
    const template = `
        <div class="wifi-profile">
            <div class="form-row">
                <div class="form-group">
                    <label>Network Name (SSID):</label>
                    <input type="text" class="wifi-ssid" placeholder="MyWiFiNetwork"
                           data-tooltip="The name of the Wi-Fi network to connect to.">
                </div>
                <div class="form-group">
                    <label>Security Type:</label>
                    <select class="wifi-security" data-tooltip="Security protocol used by the Wi-Fi network.">
                        <option value="WPA2PSK" selected>WPA2-Personal</option>
                        <option value="WPA3PSK">WPA3-Personal</option>
                        <option value="WPA2">WPA2-Enterprise</option>
                        <option value="WEP">WEP (Not Recommended)</option>
                        <option value="open">Open (No Security)</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Password:</label>
                    <input type="password" class="wifi-password" placeholder="Wi-Fi password"
                           data-tooltip="Password for the Wi-Fi network. Leave empty for open networks.">
                </div>
                <div class="form-group">
                    <button type="button" class="remove-command-btn" onclick="removeWifiProfile(this)">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            </div>
            <div class="checkbox-row">
                <div class="form-group checkbox-group">
                    <input type="checkbox" class="wifi-auto-connect" checked
                           data-tooltip="Automatically connect to this network when in range.">
                    <label>Auto-connect</label>
                </div>
                <div class="form-group checkbox-group">
                    <input type="checkbox" class="wifi-hidden"
                           data-tooltip="Check if this is a hidden network that doesn't broadcast its SSID.">
                    <label>Hidden network</label>
                </div>
            </div>
        </div>`;

    if (container) {
        container.insertAdjacentHTML('beforeend', template);
        showStatusMessage('success', 'Added new Wi-Fi profile');
    }
}

/**
 * Remove a Wi-Fi profile
 */
function removeWifiProfile(button) {
    const profile = button.closest('.wifi-profile');
    if (profile) {
        profile.remove();
        showStatusMessage('info', 'Removed Wi-Fi profile');
    }
}

/**
 * Toggle advanced pass configuration settings visibility
 */
function toggleAdvancedPassSettings() {
    const enableAdvancedPasses = document.getElementById('enable-advanced-passes');
    const advancedPassSettings = document.getElementById('advanced-pass-settings');

    if (enableAdvancedPasses && advancedPassSettings) {
        advancedPassSettings.style.display = enableAdvancedPasses.checked ? 'block' : 'none';
    }
}

/**
 * Validate configuration pass settings
 */
function validateConfigurationPasses() {
    const enablePassValidation = document.getElementById('enable-pass-validation')?.checked || false;

    if (!enablePassValidation) {
        return true;
    }

    // Check if required passes are enabled
    const requiredPasses = ['pass-windowspe', 'pass-specialize', 'pass-oobesystem'];
    const missingPasses = [];

    requiredPasses.forEach(passId => {
        const passCheckbox = document.getElementById(passId);
        if (!passCheckbox || !passCheckbox.checked) {
            missingPasses.push(passId.replace('pass-', ''));
        }
    });

    if (missingPasses.length > 0) {
        showStatusMessage('error', `Required configuration passes missing: ${missingPasses.join(', ')}`);
        return false;
    }

    return true;
}

/**
 * Get enabled configuration passes
 */
function getEnabledPasses() {
    const passes = [
        'windowsPE',
        'offlineServicing',
        'generalize',
        'specialize',
        'auditSystem',
        'auditUser',
        'oobeSystem'
    ];

    const enabledPasses = [];

    passes.forEach(pass => {
        const checkbox = document.getElementById(`pass-${pass.toLowerCase()}`);
        if (checkbox && checkbox.checked) {
            enabledPasses.push(pass);
        }
    });

    return enabledPasses;
}

/**
 * Update pass order based on selection
 */
function updatePassOrder() {
    const passOrder = document.getElementById('pass-order')?.value || 'standard';
    const enabledPasses = getEnabledPasses();

    let orderedPasses = [];

    switch (passOrder) {
        case 'standard':
            orderedPasses = [
                'windowsPE',
                'offlineServicing',
                'generalize',
                'specialize',
                'oobeSystem'
            ].filter(pass => enabledPasses.includes(pass));
            break;

        case 'audit':
            orderedPasses = [
                'windowsPE',
                'offlineServicing',
                'generalize',
                'specialize',
                'auditSystem',
                'auditUser',
                'oobeSystem'
            ].filter(pass => enabledPasses.includes(pass));
            break;

        case 'custom':
            orderedPasses = enabledPasses;
            break;
    }

    return orderedPasses;
}

/**
 * Show XML import modal
 */
function showImportModal() {
    const modal = document.getElementById('import-modal');
    if (modal) {
        modal.style.display = 'block';
        setupImportMethodToggle();
    }
}

/**
 * Close XML import modal
 */
function closeImportModal() {
    const modal = document.getElementById('import-modal');
    if (modal) {
        modal.style.display = 'none';
        clearImportForm();
    }
}

/**
 * Setup import method toggle functionality
 */
function setupImportMethodToggle() {
    const methodRadios = document.querySelectorAll('input[name="import-method"]');
    const fileSection = document.getElementById('import-file-section');
    const textSection = document.getElementById('import-text-section');

    methodRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'file') {
                fileSection.style.display = 'block';
                textSection.style.display = 'none';
            } else {
                fileSection.style.display = 'none';
                textSection.style.display = 'block';
            }
        });
    });
}

/**
 * Clear import form
 */
function clearImportForm() {
    document.getElementById('xml-file-input').value = '';
    document.getElementById('xml-text-input').value = '';
    document.getElementById('import-status').innerHTML = '';
    document.getElementById('import-status').className = 'import-status';
}

/**
 * Process XML import
 */
function processXMLImport() {
    const method = document.querySelector('input[name="import-method"]:checked').value;
    const mergeSettings = document.getElementById('import-merge-settings').checked;
    const validateXml = document.getElementById('import-validate-xml').checked;
    const statusDiv = document.getElementById('import-status');

    let xmlContent = '';

    if (method === 'file') {
        const fileInput = document.getElementById('xml-file-input');
        if (!fileInput.files.length) {
            showImportStatus('error', 'Please select an XML file to import.');
            return;
        }

        const file = fileInput.files[0];
        const reader = new FileReader();

        reader.onload = function(e) {
            xmlContent = e.target.result;
            processXMLContent(xmlContent, mergeSettings, validateXml);
        };

        reader.onerror = function() {
            showImportStatus('error', 'Error reading the selected file.');
        };

        reader.readAsText(file);
    } else {
        xmlContent = document.getElementById('xml-text-input').value.trim();
        if (!xmlContent) {
            showImportStatus('error', 'Please paste XML content to import.');
            return;
        }

        processXMLContent(xmlContent, mergeSettings, validateXml);
    }
}

/**
 * Process XML content and populate form
 */
function processXMLContent(xmlContent, mergeSettings, validateXml) {
    try {
        // Basic XML validation
        if (validateXml) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
            const parseError = xmlDoc.getElementsByTagName('parsererror');

            if (parseError.length > 0) {
                showImportStatus('error', 'Invalid XML format. Please check your XML content.');
                return;
            }

            // Check if it's an unattend.xml file
            const unattendElement = xmlDoc.getElementsByTagName('unattend')[0];
            if (!unattendElement) {
                showImportStatus('error', 'This does not appear to be a valid unattend.xml file.');
                return;
            }
        }

        // Parse and populate form fields
        const success = parseUnattendXML(xmlContent, mergeSettings);

        if (success) {
            showImportStatus('success', 'XML imported successfully! Form fields have been populated.');
            setTimeout(() => {
                closeImportModal();
            }, 2000);
        } else {
            showImportStatus('warning', 'XML imported with some issues. Please review the form fields.');
        }

    } catch (error) {
        showImportStatus('error', `Error processing XML: ${error.message}`);
    }
}

/**
 * Show import status message
 */
function showImportStatus(type, message) {
    const statusDiv = document.getElementById('import-status');
    statusDiv.className = `import-status ${type}`;
    statusDiv.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : type === 'warning' ? 'exclamation-triangle' : 'times'}"></i> ${message}`;
}

/**
 * Parse unattend.xml and populate form fields
 */
function parseUnattendXML(xmlContent, mergeSettings) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

        // Extract basic settings
        const computerName = getXMLValue(xmlDoc, 'ComputerName');
        const adminPassword = getXMLValue(xmlDoc, 'AdministratorPassword');
        const productKey = getXMLValue(xmlDoc, 'ProductKey Key');
        const timezone = getXMLValue(xmlDoc, 'TimeZone');
        const language = getXMLValue(xmlDoc, 'UILanguage');

        // Populate form fields if not merging or if field is empty
        if (!mergeSettings || !document.getElementById('computer-name').value) {
            if (computerName) document.getElementById('computer-name').value = computerName;
        }

        if (!mergeSettings || !document.getElementById('admin-password').value) {
            if (adminPassword) document.getElementById('admin-password').value = atob(adminPassword);
        }

        if (!mergeSettings || !document.getElementById('product-key').value) {
            if (productKey) document.getElementById('product-key').value = productKey;
        }

        if (!mergeSettings || !document.getElementById('timezone').value) {
            if (timezone) document.getElementById('timezone').value = timezone;
        }

        if (!mergeSettings || !document.getElementById('language').value) {
            if (language) document.getElementById('language').value = language;
        }

        return true;
    } catch (error) {
        console.error('Error parsing XML:', error);
        return false;
    }
}

/**
 * Get XML element value by tag name
 */
function getXMLValue(xmlDoc, tagName) {
    const elements = xmlDoc.getElementsByTagName(tagName);
    return elements.length > 0 ? elements[0].textContent : null;
}

/**
 * Show validation modal
 */
function showValidationModal() {
    const modal = document.getElementById('validation-modal');
    if (modal) {
        modal.style.display = 'block';
        // Add a small delay to ensure modal is visible before running validation
        setTimeout(() => {
            performValidation();
        }, 100);
    } else {
        console.error('Validation modal not found');
        showStatusMessage('error', 'Validation modal not found');
    }
}

/**
 * Close validation modal
 */
function closeValidationModal() {
    const modal = document.getElementById('validation-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Perform comprehensive configuration validation
 */
function performValidation() {
    const resultsDiv = document.getElementById('validation-results');
    const validationResults = [];

    console.log('Starting validation...', { resultsDiv });

    if (!resultsDiv) {
        console.error('validation-results div not found in performValidation');
        showStatusMessage('error', 'Validation results container not found');
        return;
    }

    // Get configuration pass validation setting
    const enablePassValidation = document.getElementById('enable-pass-validation')?.checked || false;

    // Validate user accounts
    const adminUsername = document.getElementById('admin-username')?.value;
    const adminPassword = document.getElementById('admin-password')?.value;
    const userUsername = document.getElementById('user-username')?.value;
    const userPassword = document.getElementById('user-password')?.value;

    if (!adminUsername || adminUsername.trim() === '') {
        validationResults.push({
            type: 'error',
            title: 'Administrator Username Required',
            message: 'Administrator username cannot be empty.'
        });
    }

    if (!adminPassword || adminPassword.length < 8) {
        validationResults.push({
            type: 'warning',
            title: 'Weak Administrator Password',
            message: 'Administrator password should be at least 8 characters long for security.'
        });
    }

    // Validate user account if provided
    if (userUsername && userUsername.trim() !== '') {
        if (!userPassword || userPassword.length < 6) {
            validationResults.push({
                type: 'warning',
                title: 'Weak User Password',
                message: 'User password should be at least 6 characters long.'
            });
        }
    }

    // Validate computer settings
    const computerName = document.getElementById('computer-name')?.value;
    if (computerName && computerName.length > 15) {
        validationResults.push({
            type: 'error',
            title: 'Computer Name Too Long',
            message: 'Computer name must be 15 characters or less for Windows compatibility.'
        });
    }

    // Validate domain settings
    const joinDomain = document.getElementById('join-domain')?.checked;
    if (joinDomain) {
        const domainName = document.getElementById('domain-name')?.value;
        const domainUsername = document.getElementById('domain-username')?.value;
        const domainPassword = document.getElementById('domain-password')?.value;

        if (!domainName) {
            validationResults.push({
                type: 'error',
                title: 'Domain Name Required',
                message: 'Domain name is required when domain join is enabled.'
            });
        }

        if (!domainUsername || !domainPassword) {
            validationResults.push({
                type: 'error',
                title: 'Domain Credentials Required',
                message: 'Domain username and password are required for domain join.'
            });
        }
    }

    // Validate disk configuration
    const enableDiskConfig = document.getElementById('enable-disk-config')?.checked;
    if (enableDiskConfig) {
        validationResults.push({
            type: 'warning',
            title: 'Disk Configuration Enabled',
            message: 'Disk partitioning will erase all data on the target disk. Ensure you have backups.'
        });
    }

    // Validate product key format if provided
    const productKey = document.getElementById('product-key')?.value;
    if (productKey && productKey.trim() !== '') {
        const keyPattern = /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/;
        if (!keyPattern.test(productKey.toUpperCase())) {
            validationResults.push({
                type: 'warning',
                title: 'Invalid Product Key Format',
                message: 'Product key should be in format XXXXX-XXXXX-XXXXX-XXXXX-XXXXX.'
            });
        }
    }

    // Validate timezone selection
    const timezone = document.getElementById('timezone')?.value;
    if (!timezone) {
        validationResults.push({
            type: 'warning',
            title: 'No Timezone Selected',
            message: 'Please select a timezone for proper system configuration.'
        });
    }

    // Validate language selection
    const language = document.getElementById('language')?.value;
    if (!language) {
        validationResults.push({
            type: 'warning',
            title: 'No Language Selected',
            message: 'Please select a system language.'
        });
    }

    // Validate configuration passes
    if (enablePassValidation && !validateConfigurationPasses()) {
        validationResults.push({
            type: 'error',
            title: 'Configuration Pass Validation Failed',
            message: 'Required configuration passes are missing or invalid.'
        });
    }

    // Add success message if no issues
    if (validationResults.length === 0) {
        validationResults.push({
            type: 'success',
            title: 'Configuration Valid',
            message: 'All settings appear to be valid and ready for XML generation.'
        });
    }

    // Display results
    displayValidationResults(validationResults);
}

/**
 * Display validation results in the modal
 */
function displayValidationResults(results) {
    const resultsDiv = document.getElementById('validation-results');
    console.log('Displaying validation results:', { results, resultsDiv });

    if (!resultsDiv) {
        console.error('validation-results div not found');
        return;
    }

    let html = '<div class="validation-results">';

    results.forEach(result => {
        html += `
            <div class="validation-item ${result.type}">
                <h5>${result.title}</h5>
                <p>${result.message}</p>
            </div>`;
    });

    html += '</div>';
    resultsDiv.innerHTML = html;
    console.log('Validation results HTML set:', html);
}

/**
 * Show help modal
 */
function showHelpModal() {
    const modal = document.getElementById('help-modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

/**
 * Close help modal
 */
function closeHelpModal() {
    const modal = document.getElementById('help-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Toggle between light and dark theme
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);

    // Update theme button text and icon
    const themeText = document.getElementById('theme-text');
    const themeIcon = document.querySelector('.theme-toggle-btn i');

    if (newTheme === 'dark') {
        themeText.textContent = 'Light Mode';
        themeIcon.className = 'fas fa-sun';
    } else {
        themeText.textContent = 'Dark Mode';
        themeIcon.className = 'fas fa-moon';
    }

    // Save theme preference
    localStorage.setItem('unattend-theme', newTheme);

    showStatusMessage('info', `Switched to ${newTheme} theme`);
}

/**
 * Initialize theme from localStorage
 */
function initializeTheme() {
    const savedTheme = localStorage.getItem('unattend-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const themeText = document.getElementById('theme-text');
    const themeIcon = document.querySelector('.theme-toggle-btn i');

    if (savedTheme === 'dark') {
        themeText.textContent = 'Light Mode';
        themeIcon.className = 'fas fa-sun';
    } else {
        themeText.textContent = 'Dark Mode';
        themeIcon.className = 'fas fa-moon';
    }
}

/**
 * Enhanced tooltip system
 */
function initializeTooltips() {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');

    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
        element.addEventListener('mousemove', moveTooltip);
    });
}

/**
 * Show tooltip
 */
function showTooltip(event) {
    const tooltipText = event.target.getAttribute('data-tooltip');
    if (!tooltipText) return;

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = tooltipText;
    tooltip.id = 'active-tooltip';

    document.body.appendChild(tooltip);

    // Position tooltip
    const rect = event.target.getBoundingClientRect();
    tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
    tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';

    // Show tooltip with animation
    setTimeout(() => {
        tooltip.classList.add('show');
    }, 10);
}

/**
 * Hide tooltip
 */
function hideTooltip() {
    const tooltip = document.getElementById('active-tooltip');
    if (tooltip) {
        tooltip.remove();
    }
}

/**
 * Move tooltip with mouse
 */
function moveTooltip(event) {
    const tooltip = document.getElementById('active-tooltip');
    if (tooltip) {
        const rect = event.target.getBoundingClientRect();
        tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';
    }
}

/**
 * Enhanced error handling and logging
 */
class UnattendErrorHandler {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.debugMode = localStorage.getItem('unattend-debug') === 'true';
    }

    logError(error, context = '') {
        const errorObj = {
            message: error.message || error,
            context: context,
            timestamp: new Date().toISOString(),
            stack: error.stack || new Error().stack
        };

        this.errors.push(errorObj);

        if (this.debugMode) {
            console.error('Unattend Error:', errorObj);
        }

        // Show user-friendly error message
        showStatusMessage('error', `Error: ${errorObj.message}`);
    }

    logWarning(message, context = '') {
        const warningObj = {
            message: message,
            context: context,
            timestamp: new Date().toISOString()
        };

        this.warnings.push(warningObj);

        if (this.debugMode) {
            console.warn('Unattend Warning:', warningObj);
        }
    }

    getErrorReport() {
        return {
            errors: this.errors,
            warnings: this.warnings,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
    }

    clearErrors() {
        this.errors = [];
        this.warnings = [];
    }

    exportErrorLog() {
        const report = this.getErrorReport();
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `unattend-error-log-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Initialize global error handler
const errorHandler = new UnattendErrorHandler();

/**
 * Comprehensive testing framework
 */
class UnattendTester {
    constructor() {
        this.tests = [];
        this.results = [];
    }

    addTest(name, testFunction, description = '') {
        this.tests.push({
            name: name,
            test: testFunction,
            description: description
        });
    }

    async runAllTests() {
        this.results = [];

        for (const test of this.tests) {
            try {
                const startTime = performance.now();
                const result = await test.test();
                const endTime = performance.now();

                this.results.push({
                    name: test.name,
                    description: test.description,
                    passed: result === true,
                    result: result,
                    duration: endTime - startTime,
                    error: null
                });
            } catch (error) {
                this.results.push({
                    name: test.name,
                    description: test.description,
                    passed: false,
                    result: null,
                    duration: 0,
                    error: error.message
                });
            }
        }

        return this.results;
    }

    getTestReport() {
        const passed = this.results.filter(r => r.passed).length;
        const failed = this.results.filter(r => !r.passed).length;

        return {
            total: this.results.length,
            passed: passed,
            failed: failed,
            passRate: this.results.length > 0 ? (passed / this.results.length * 100).toFixed(2) : 0,
            results: this.results,
            timestamp: new Date().toISOString()
        };
    }
}

// Initialize testing framework
const tester = new UnattendTester();

/**
 * Add comprehensive tests
 */
function initializeTests() {
    // Test XML generation
    tester.addTest('XML Generation', () => {
        try {
            const xml = generateUnattendXML();
            return xml && xml.includes('<unattend') && xml.includes('</unattend>');
        } catch (error) {
            errorHandler.logError(error, 'XML Generation Test');
            return false;
        }
    }, 'Tests basic XML generation functionality');

    // Test form validation
    tester.addTest('Form Validation', () => {
        try {
            // Set some test values
            document.getElementById('admin-username').value = 'TestAdmin';
            document.getElementById('admin-password').value = 'TestPassword123';
            document.getElementById('computer-name').value = 'TEST-PC';

            return validateCurrentConfig();
        } catch (error) {
            errorHandler.logError(error, 'Form Validation Test');
            return false;
        }
    }, 'Tests form validation functionality');

    // Test preset loading
    tester.addTest('Preset Loading', () => {
        try {
            loadPreset('basic');
            const adminUsername = document.getElementById('admin-username').value;
            return adminUsername === 'Administrator';
        } catch (error) {
            errorHandler.logError(error, 'Preset Loading Test');
            return false;
        }
    }, 'Tests preset loading functionality');

    // Test help modal functionality
    tester.addTest('Help Modal', () => {
        try {
            showHelpModal();
            const modal = document.getElementById('help-modal');
            const isVisible = modal && modal.style.display === 'block';
            closeHelpModal();
            return isVisible;
        } catch (error) {
            errorHandler.logError(error, 'Help Modal Test');
            return false;
        }
    }, 'Tests help modal functionality');

    // Test configuration pass validation
    tester.addTest('Configuration Passes', () => {
        try {
            const passes = getEnabledPasses();
            return Array.isArray(passes) && passes.length > 0;
        } catch (error) {
            errorHandler.logError(error, 'Configuration Passes Test');
            return false;
        }
    }, 'Tests configuration pass management');
}

/**
 * Run comprehensive tests
 */
async function runComprehensiveTests() {
    try {
        showStatusMessage('info', 'Running comprehensive tests...');

        const results = await tester.runAllTests();
        const report = tester.getTestReport();

        console.log('Test Report:', report);

        if (report.failed === 0) {
            showStatusMessage('success', `All ${report.total} tests passed! (${report.passRate}%)`);
        } else {
            showStatusMessage('warning', `${report.passed}/${report.total} tests passed (${report.passRate}%). ${report.failed} tests failed.`);
        }

        return report;
    } catch (error) {
        errorHandler.logError(error, 'Comprehensive Testing');
        showStatusMessage('error', 'Error running tests');
        return null;
    }
}

/**
 * Enhanced validation with detailed reporting
 */
function validateCurrentConfig() {
    try {
        const validationResults = [];

        // Validate required fields
        const requiredFields = [
            { id: 'admin-username', name: 'Administrator Username' },
            { id: 'admin-password', name: 'Administrator Password' },
            { id: 'timezone', name: 'Time Zone' },
            { id: 'language', name: 'System Language' }
        ];

        requiredFields.forEach(field => {
            const element = document.getElementById(field.id);
            if (!element || !element.value || element.value.trim() === '') {
                validationResults.push({
                    type: 'error',
                    field: field.id,
                    message: `${field.name} is required`
                });
            }
        });

        // Validate password strength
        const adminPassword = document.getElementById('admin-password')?.value;
        if (adminPassword && adminPassword.length < 8) {
            validationResults.push({
                type: 'warning',
                field: 'admin-password',
                message: 'Administrator password should be at least 8 characters long'
            });
        }

        // Validate computer name
        const computerName = document.getElementById('computer-name')?.value;
        if (computerName && computerName.length > 15) {
            validationResults.push({
                type: 'error',
                field: 'computer-name',
                message: 'Computer name must be 15 characters or less'
            });
        }

        return validationResults.filter(r => r.type === 'error').length === 0;
    } catch (error) {
        errorHandler.logError(error, 'Configuration Validation');
        return false;
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

    // Setup disk configuration toggles
    const enableDiskConfigCheckbox = document.getElementById('enable-disk-config');
    if (enableDiskConfigCheckbox) {
        enableDiskConfigCheckbox.addEventListener('change', toggleDiskConfigSettings);
    }

    const partitionStyleSelect = document.getElementById('partition-style');
    if (partitionStyleSelect) {
        partitionStyleSelect.addEventListener('change', updatePartitionStyle);
    }

    const osPartitionSizeSelect = document.getElementById('os-partition-size');
    if (osPartitionSizeSelect) {
        osPartitionSizeSelect.addEventListener('change', toggleOSCustomSize);
    }

    // Setup script execution toggle
    const enableScriptsCheckbox = document.getElementById('enable-scripts');
    if (enableScriptsCheckbox) {
        enableScriptsCheckbox.addEventListener('change', toggleScriptSettings);
    }

    // Setup BitLocker configuration toggle
    const enableBitLockerConfigCheckbox = document.getElementById('enable-bitlocker-config');
    if (enableBitLockerConfigCheckbox) {
        enableBitLockerConfigCheckbox.addEventListener('change', toggleBitLockerSettings);
    }

    // Setup app removal toggle
    const enableAppRemovalCheckbox = document.getElementById('enable-app-removal');
    if (enableAppRemovalCheckbox) {
        enableAppRemovalCheckbox.addEventListener('change', toggleAppRemovalSettings);
    }

    // Setup Wi-Fi configuration toggle
    const enableWifiConfigCheckbox = document.getElementById('enable-wifi-config');
    if (enableWifiConfigCheckbox) {
        enableWifiConfigCheckbox.addEventListener('change', toggleWifiSettings);
    }

    // Setup proxy configuration toggle
    const enableProxyConfigCheckbox = document.getElementById('enable-proxy-config');
    if (enableProxyConfigCheckbox) {
        enableProxyConfigCheckbox.addEventListener('change', toggleProxySettings);
    }

    // Setup advanced pass configuration toggle
    const enableAdvancedPassesCheckbox = document.getElementById('enable-advanced-passes');
    if (enableAdvancedPassesCheckbox) {
        enableAdvancedPassesCheckbox.addEventListener('change', toggleAdvancedPassSettings);
    }

    // Setup pass order change handler
    const passOrderSelect = document.getElementById('pass-order');
    if (passOrderSelect) {
        passOrderSelect.addEventListener('change', updatePassOrder);
    }

    // Setup import and validation buttons
    const importXmlButton = document.getElementById('import-xml');
    if (importXmlButton) {
        importXmlButton.addEventListener('click', showImportModal);
    }

    const validateConfigButton = document.getElementById('validate-config');
    if (validateConfigButton) {
        validateConfigButton.addEventListener('click', showValidationModal);
    }

    // Initialize tooltips
    initializeTooltips();

    // Initialize testing framework
    initializeTests();

    // Add debug mode toggle (Ctrl+Shift+D)
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            const debugMode = !errorHandler.debugMode;
            errorHandler.debugMode = debugMode;
            localStorage.setItem('unattend-debug', debugMode.toString());
            showStatusMessage('info', `Debug mode ${debugMode ? 'enabled' : 'disabled'}`);
        }

        // Add test runner shortcut (Ctrl+Shift+T)
        if (e.ctrlKey && e.shiftKey && e.key === 'T') {
            runComprehensiveTests();
        }
    });

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
window.toggleDiskConfigSettings = toggleDiskConfigSettings;
window.toggleOSCustomSize = toggleOSCustomSize;
window.updatePartitionStyle = updatePartitionStyle;
window.loadPartitionPreset = loadPartitionPreset;
window.toggleScriptSettings = toggleScriptSettings;
window.addCommand = addCommand;
window.removeCommand = removeCommand;
window.toggleBitLockerSettings = toggleBitLockerSettings;
window.toggleAppRemovalSettings = toggleAppRemovalSettings;
window.toggleWifiSettings = toggleWifiSettings;
window.toggleProxySettings = toggleProxySettings;
window.addWifiProfile = addWifiProfile;
window.removeWifiProfile = removeWifiProfile;
window.toggleAdvancedPassSettings = toggleAdvancedPassSettings;
window.validateConfigurationPasses = validateConfigurationPasses;
window.getEnabledPasses = getEnabledPasses;
window.updatePassOrder = updatePassOrder;
window.showImportModal = showImportModal;
window.closeImportModal = closeImportModal;
window.processXMLImport = processXMLImport;
window.showValidationModal = showValidationModal;
window.closeValidationModal = closeValidationModal;
window.showHelpModal = showHelpModal;
window.closeHelpModal = closeHelpModal;
window.runComprehensiveTests = runComprehensiveTests;
window.validateCurrentConfig = validateCurrentConfig;
window.errorHandler = errorHandler;
window.tester = tester;
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
