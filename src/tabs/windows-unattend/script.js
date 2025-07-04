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

    // Reinitialize tooltips after loading preset
    setTimeout(() => {
        initTooltips();
    }, 100);

    showStatusMessage('success', `Loaded "${preset.name}" preset configuration`);
}

/**
 * Encode password for Windows unattend.xml (UTF-16LE base64)
 */
function encodePasswordForWindows(password) {
    if (!password) return '';

    // Convert to UTF-16LE and then base64
    const utf16leBytes = [];
    for (let i = 0; i < password.length; i++) {
        const charCode = password.charCodeAt(i);
        utf16leBytes.push(charCode & 0xFF);
        utf16leBytes.push((charCode >> 8) & 0xFF);
    }

    // Convert bytes to base64
    const binaryString = String.fromCharCode.apply(null, utf16leBytes);
    return btoa(binaryString);
}

/**
 * Escape special XML characters
 */
function escapeXml(unsafe) {
    if (typeof unsafe !== 'string') {
        return unsafe;
    }
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '<';
            case '>': return '>';
            case '&': return '&';
            case "'": return ''';
            case '"': return '"';
        }
    });
}

/**
 * Generate FirstLogonCommands for feature and privacy settings
 */
function generateFirstLogonCommands(settings) {
    let commands = '';
    let commandIndex = 1;

    const addCommand = (command) => {
        const escapedCommand = escapeXml(command);
        commands += `
                    <SynchronousCommand wcm:action="add">
                        <Order>${commandIndex++}</Order>
                        <CommandLine>${escapedCommand}</CommandLine>
                        <Description>WinTool Customization</Description>
                        <RequiresUserInput>false</RequiresUserInput>
                    </SynchronousCommand>`;
    };

    // PowerShell Execution Policy
    if (settings.featurePowershell) {
        addCommand('powershell -Command "Set-ExecutionPolicy RemoteSigned -Force"');
    } else {
        addCommand('powershell -Command "Set-ExecutionPolicy Restricted -Force"');
    }

    // UAC
    if (settings.featureUac) {
        addCommand('reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v EnableLUA /t REG_DWORD /d 1 /f');
    } else {
        addCommand('reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v EnableLUA /t REG_DWORD /d 0 /f');
    }

    // Windows Defender (Enable is default, so we only act on disable)
    if (!settings.featureDefender) {
        addCommand('reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows Defender" /v DisableAntiSpyware /t REG_DWORD /d 1 /f');
    }

    // Windows Firewall
    if (settings.featureFirewall) {
        addCommand('netsh advfirewall set allprofiles state on');
    } else {
        addCommand('netsh advfirewall set allprofiles state off');
    }

    // SmartScreen
    if (settings.featureSmartscreen) {
        addCommand('reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v EnableSmartScreen /t REG_DWORD /d 1 /f');
    } else {
        addCommand('reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v EnableSmartScreen /t REG_DWORD /d 0 /f');
    }

    // Telemetry (UI says "Disable", so checked=true means disable)
    if (settings.featureTelemetry) {
        addCommand('reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v AllowTelemetry /t REG_DWORD /d 0 /f');
    }

    // Cortana (UI says "Disable", so checked=true means disable)
    if (settings.featureCortana) {
        addCommand('reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v AllowCortana /t REG_DWORD /d 0 /f');
    }

    // Location Services (UI says "Disable", so checked=true means disable)
    if (settings.featureLocation) {
        addCommand('reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors" /v DisableLocation /t REG_DWORD /d 1 /f');
    }

    // Advertising ID (UI says "Disable", so checked=true means disable)
    if (settings.featureAds) {
        addCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" /v Enabled /t REG_DWORD /d 0 /f');
    }

    // Automatic Updates
    if (settings.featureUpdates) {
        addCommand('reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" /v NoAutoUpdate /t REG_DWORD /d 0 /f');
        addCommand('reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" /v AUOptions /t REG_DWORD /d 4 /f');
    } else {
        addCommand('reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" /v NoAutoUpdate /t REG_DWORD /d 1 /f');
    }

    // Hibernation
    if (settings.featureHibernation) {
        addCommand('powercfg /hibernate on');
    } else {
        addCommand('powercfg /hibernate off');
    }

    // Remote Desktop
    if (settings.featureRemoteDesktop) {
        addCommand('reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server" /v fDenyTSConnections /t REG_DWORD /d 0 /f');
        addCommand('netsh advfirewall firewall set rule group="remote desktop" new enable=Yes');
    } else {
        addCommand('reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server" /v fDenyTSConnections /t REG_DWORD /d 1 /f');
    }
    
    // Hide Admin account from login
    if (settings.hideAdmin) {
        addCommand(`reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon\\SpecialAccounts\\UserList" /v "${settings.adminUsername}" /t REG_DWORD /d 0 /f`);
    }


    if (commands) {
        return `<FirstLogonCommands>${commands}
                </FirstLogonCommands>`;
    }
    return '';
}

/**
 * Generate Windows unattend.xml content based on form data
 */
function generateUnattendXML() {
    // Get form values and escape them
    const adminUsernameRaw = document.getElementById('admin-username')?.value || 'Administrator';
    const adminUsername = escapeXml(adminUsernameRaw);
    const adminPassword = document.getElementById('admin-password')?.value || '';
    const userUsername = escapeXml(document.getElementById('user-username')?.value || '');
    const userPassword = document.getElementById('user-password')?.value || '';
    const autoLogon = document.getElementById('auto-logon')?.checked || false;
    const hideAdmin = document.getElementById('hide-admin')?.checked || false;

    const timezone = escapeXml(document.getElementById('timezone')?.value || 'Eastern Standard Time');
    const language = escapeXml(document.getElementById('language')?.value || 'en-US');
    const keyboard = escapeXml(document.getElementById('keyboard')?.value || '0409:00000409');
    const locale = escapeXml(document.getElementById('locale')?.value || 'en-US');

    const computerName = escapeXml(document.getElementById('computer-name')?.value) || '*';
    const workgroup = escapeXml(document.getElementById('workgroup')?.value || 'WORKGROUP');
    const organization = escapeXml(document.getElementById('organization')?.value || '');
    const owner = escapeXml(document.getElementById('owner')?.value || 'User');
    const description = escapeXml(document.getElementById('description')?.value || '');

    const windowsEdition = escapeXml(document.getElementById('windows-edition')?.value || 'Windows 11 Pro');
    const architecture = escapeXml(document.getElementById('architecture')?.value || 'amd64');
    const productKey = escapeXml(document.getElementById('product-key')?.value || '');
    const acceptEula = document.getElementById('accept-eula')?.checked || true;
    const skipOem = document.getElementById('skip-oem')?.checked || true;

    const enableNetwork = document.getElementById('enable-network')?.checked || true;
    const skipNetworkSetup = document.getElementById('skip-network-setup')?.checked || true;
    const joinDomain = document.getElementById('join-domain')?.checked || false;
    const domainName = escapeXml(document.getElementById('domain-name')?.value || '');
    const domainUsername = escapeXml(document.getElementById('domain-username')?.value || '');
    const domainPassword = document.getElementById('domain-password')?.value || '';

    // Collect all feature settings into an object
    const featureSettings = {
        adminUsername: adminUsernameRaw,
        hideAdmin,
        featureDefender: document.getElementById('feature-defender')?.checked || false,
        featureFirewall: document.getElementById('feature-firewall')?.checked || false,
        featureUac: document.getElementById('feature-uac')?.checked || false,
        featureSmartscreen: document.getElementById('feature-smartscreen')?.checked || false,
        featureTelemetry: document.getElementById('feature-telemetry')?.checked || false,
        featureCortana: document.getElementById('feature-cortana')?.checked || false,
        featureLocation: document.getElementById('feature-location')?.checked || false,
        featureAds: document.getElementById('feature-ads')?.checked || false,
        featureUpdates: document.getElementById('feature-updates')?.checked || false,
        featureHibernation: document.getElementById('feature-hibernation')?.checked || false,
        featureRemoteDesktop: document.getElementById('feature-remote-desktop')?.checked || false,
        featurePowershell: document.getElementById('feature-powershell')?.checked || false,
    };

    // Get OOBE settings
    const oobeSkipMachine = document.getElementById('oobe-skip-machine-oobe')?.checked || false;
    const oobeSkipUser = document.getElementById('oobe-skip-user-oobe')?.checked || false;
    const oobeHideEula = document.getElementById('oobe-hide-eula')?.checked || false;
    const oobeHideWireless = document.getElementById('oobe-hide-wireless')?.checked || false;
    const oobeProtectPc = document.getElementById('oobe-protect-pc')?.checked || false;
    const oobeHideOnlineAccount = document.getElementById('oobe-hide-online-account')?.checked || false;

    // Generate FirstLogonCommands
    const firstLogonCommands = generateFirstLogonCommands(featureSettings);

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
        <component name="Microsoft-Windows-Setup" processorArchitecture="${architecture}" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <DiskConfiguration>
                <Disk wcm:action="add">
                    <CreatePartitions>
                        <CreatePartition wcm:action="add">
                            <Order>1</Order>
                            <Type>EFI</Type>
                            <Size>100</Size>
                        </CreatePartition>
                        <CreatePartition wcm:action="add">
                            <Order>2</Order>
                            <Type>MSR</Type>
                            <Size>16</Size>
                        </CreatePartition>
                        <CreatePartition wcm:action="add">
                            <Order>3</Order>
                            <Type>Primary</Type>
                            <Extend>true</Extend>
                        </CreatePartition>
                    </CreatePartitions>
                    <ModifyPartitions>
                        <ModifyPartition wcm:action="add">
                            <Order>1</Order>
                            <PartitionID>1</PartitionID>
                            <Label>System</Label>
                            <Format>FAT32</Format>
                        </ModifyPartition>
                        <ModifyPartition wcm:action="add">
                            <Order>2</Order>
                            <PartitionID>3</PartitionID>
                            <Label>Windows</Label>
                            <Letter>C</Letter>
                            <Format>NTFS</Format>
                        </ModifyPartition>
                    </ModifyPartitions>
                    <DiskID>0</DiskID>
                    <WillWipeDisk>true</WillWipeDisk>
                </Disk>
            </DiskConfiguration>
            <UserData>
                ${productKey ? `<ProductKey><Key>${productKey}</Key></ProductKey>` : ''}
                <AcceptEula>${acceptEula ? 'true' : 'false'}</AcceptEula>
                <FullName>${owner}</FullName>
                <Organization>${organization}</Organization>
            </UserData>
            <EnableNetwork>${enableNetwork ? 'true' : 'false'}</EnableNetwork>
            <ImageInstall>
                <OSImage>
                    <InstallTo>
                        <DiskID>0</DiskID>
                        <PartitionID>3</PartitionID>
                    </InstallTo>
                    <WillShowUI>OnError</WillShowUI>
                    <InstallToAvailablePartition>false</InstallToAvailablePartition>
                </OSImage>
            </ImageInstall>
        </component>
    </settings>
    <!-- Specialize Pass -->
    <settings pass="specialize">
        <component name="Microsoft-Windows-Shell-Setup" processorArchitecture="${architecture}" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <ComputerName>${computerName}</ComputerName>
            <TimeZone>${timezone}</TimeZone>
            ${organization ? `<RegisteredOrganization>${organization}</RegisteredOrganization>` : ''}
            ${owner ? `<RegisteredOwner>${owner}</RegisteredOwner>` : ''}
            ${description ? `<Description>${description}</Description>` : ''}
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
                <JoinDomain>${domainName}</JoinDomain>
                ${(domainUsername && domainPassword) ?
                `<Credentials>
                    <Domain>${domainName}</Domain>
                    <Username>${domainUsername}</Username>
                    <Password>${encodePasswordForWindows(domainPassword)}</Password>
                </Credentials>` : ''}
            </Identification>
        </component>`;
    }

    xml += `
    </settings>
    <!-- OOBE System Pass -->
    <settings pass="oobeSystem">
        <component name="Microsoft-Windows-Shell-Setup" processorArchitecture="${architecture}" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <OOBE>
                <HideEULAPage>${oobeHideEula ? 'true' : 'false'}</HideEULAPage>
                <HideLocalAccountScreen>true</HideLocalAccountScreen>
                <HideOEMRegistrationScreen>${skipOem ? 'true' : 'false'}</HideOEMRegistrationScreen>
                <HideOnlineAccountScreens>${oobeHideOnlineAccount ? 'true' : 'false'}</HideOnlineAccountScreens>
                <HideWirelessSetupInOOBE>${oobeHideWireless ? 'true' : 'false'}</HideWirelessSetupInOOBE>
                <NetworkLocation>Work</NetworkLocation>
                <ProtectYourPC>${oobeProtectPc ? '1' : '3'}</ProtectYourPC>
                <SkipUserOOBE>${oobeSkipUser ? 'true' : 'false'}</SkipUserOOBE>
                <SkipMachineOOBE>${oobeSkipMachine ? 'true' : 'false'}</SkipMachineOOBE>
            </OOBE>
            <UserAccounts>
                <AdministratorPassword>
                    <Value>${encodePasswordForWindows(adminPassword)}</Value>
                    <PlainText>false</PlainText>
                </AdministratorPassword>`;

    if (userUsername) {
        xml += `
                <LocalAccounts>
                    <LocalAccount wcm:action="add">
                        <Password>
                            <Value>${encodePasswordForWindows(userPassword)}</Value>
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
                    <Value>${encodePasswordForWindows(userPassword)}</Value>
                    <PlainText>false</PlainText>
                </Password>
                <Enabled>true</Enabled>
                <LogonCount>1</LogonCount>
                <Username>${userUsername}</Username>
            </AutoLogon>`;
    }

    // Add FirstLogonCommands if any were generated
    if (firstLogonCommands) {
        xml += `
            ${firstLogonCommands}`;
    }

    xml += `
        </component>
    </settings>
</unattend>`;

    return xml;
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
 * Reset form to default values
 */
function resetForm() {
    if (confirm('Are you sure you want to reset all settings to default values?')) {
        // Reset text inputs
        document.getElementById('admin-username').value = 'Administrator';
        document.getElementById('admin-password').value = '';
        document.getElementById('user-username').value = '';
        document.getElementById('user-password').value = '';
        document.getElementById('computer-name').value = '';
        document.getElementById('workgroup').value = 'WORKGROUP';
        document.getElementById('organization').value = '';
        document.getElementById('owner').value = '';
        document.getElementById('product-key').value = '';
        document.getElementById('domain-name').value = '';

        // Reset selects
        document.getElementById('timezone').value = 'UTC';
        document.getElementById('language').value = 'en-US';
        document.getElementById('keyboard').value = '0409:00000409';

        // Reset checkboxes
        document.getElementById('auto-logon').checked = false;
        document.getElementById('enable-network').checked = true;
        document.getElementById('join-domain').checked = false;
        document.getElementById('feature-telemetry').checked = false;
        document.getElementById('feature-cortana').checked = false;
        document.getElementById('feature-defender').checked = false;
        document.getElementById('feature-updates').checked = false;
        document.getElementById('feature-firewall').checked = false;
        document.getElementById('feature-uac').checked = false;

        // Hide domain settings
        document.getElementById('domain-settings').style.display = 'none';

        showStatusMessage('info', 'Form has been reset to default values');
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

    // Add stronger password validation
    if (adminPassword && adminPassword.length < 8) {
        showStatusMessage('error', 'Administrator password must be at least 8 characters');
        return false;
    }

    // Add domain validation 
    if (document.getElementById('join-domain')?.checked) {
        const domainName = document.getElementById('domain-name')?.value;
        if (!domainName || !domainName.includes('.')) {
            showStatusMessage('error', 'Please enter a valid domain name');
            return false;
        }
    }

    // Check if auto-logon is enabled but user account is not set up
    if (autoLogon && (!userUsername || !userPassword)) {
        showStatusMessage('warning', 'Auto-logon requires a user account with username and password');
        return false;
    }

    // Warn if no administrator password is set
    if (!adminPassword) {
        if (!confirm('No administrator password is set. This may create a security risk. Continue anyway?')) {
            return false;
        }
    }

    return true;
}

// Add XML schema validation
function validateXMLContent(xmlContent) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        
        // Check for required elements
        const requiredElements = ['unattend', 'settings', 'component'];
        for (const element of requiredElements) {
            if (xmlDoc.getElementsByTagName(element).length === 0) {
                throw new Error(`Missing required <${element}> element`);
            }
        }
        
        return true;
    } catch (error) {
        throw new Error('XML validation failed: ' + error.message);
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
            showStatusMessage('success', 'XML content copied. Fallback method used.');
        }
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        showStatusMessage('error', 'Failed to copy XML to clipboard');
    }
}

// Track initialization to prevent multiple calls
let isInitialized = false;

/**
 * Simple tooltip implementation
 */
let currentTooltip = null;

function showTooltip(element, text) {
    hideTooltip();

    if (!text) return;

    const tooltip = document.createElement('div');
    tooltip.className = 'custom-tooltip';
    tooltip.textContent = text;
    tooltip.style.cssText = `
        position: fixed;
        background: #333;
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 10000;
        max-width: 250px;
        word-wrap: break-word;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        pointer-events: none;
    `;

    document.body.appendChild(tooltip);

    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let top = rect.top - tooltipRect.height - 8;
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

    if (top < 8) {
        top = rect.bottom + 8;
    }

    if (left < 8) {
        left = 8;
    } else if (left + tooltipRect.width > window.innerWidth - 8) {
        left = window.innerWidth - tooltipRect.width - 8;
    }

    tooltip.style.top = top + 'px';
    tooltip.style.left = left + 'px';

    currentTooltip = tooltip;
}

function hideTooltip() {
    if (currentTooltip) {
        currentTooltip.remove();
        currentTooltip = null;
    }
}

function initTooltips() {
    // Remove existing tooltip listeners
    document.querySelectorAll('[data-tooltip]').forEach(element => {
        element.removeEventListener('mouseenter', element._tooltipEnter);
        element.removeEventListener('mouseleave', element._tooltipLeave);

        // Also remove from associated elements
        if (element._tooltipLabel) {
            element._tooltipLabel.removeEventListener('mouseenter', element._tooltipEnter);
            element._tooltipLabel.removeEventListener('mouseleave', element._tooltipLeave);
        }
        if (element._tooltipGroup) {
            element._tooltipGroup.removeEventListener('mouseenter', element._tooltipEnter);
            element._tooltipGroup.removeEventListener('mouseleave', element._tooltipLeave);
        }
    });

    // Add new tooltip listeners
    document.querySelectorAll('[data-tooltip]').forEach(element => {
        const tooltipText = element.getAttribute('data-tooltip');

        element._tooltipEnter = () => showTooltip(element, tooltipText);
        element._tooltipLeave = () => hideTooltip();

        // Add to the main element
        element.addEventListener('mouseenter', element._tooltipEnter);
        element.addEventListener('mouseleave', element._tooltipLeave);

        // Special handling for checkboxes
        if (element.type === 'checkbox') {
            // Find the associated label
            const label = element.nextElementSibling;
            if (label && label.tagName === 'LABEL') {
                label.addEventListener('mouseenter', element._tooltipEnter);
                label.addEventListener('mouseleave', element._tooltipLeave);
                element._tooltipLabel = label;
            }

            // Find the checkbox group container
            const checkboxGroup = element.closest('.checkbox-group');
            if (checkboxGroup) {
                checkboxGroup.addEventListener('mouseenter', element._tooltipEnter);
                checkboxGroup.addEventListener('mouseleave', element._tooltipLeave);
                element._tooltipGroup = checkboxGroup;
            }
        }
    });
}

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

    // Initialize tooltips
    initTooltips();

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
window.toggleDomainSettings = toggleDomainSettings;
window.showXMLPreview = showXMLPreview;
window.closeXMLPreview = closeXMLPreview;
window.copyXMLToClipboard = copyXMLToClipboard;

// Initialize when the tab is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWindowsUnattend);
} else {
    initWindowsUnattend();
}
