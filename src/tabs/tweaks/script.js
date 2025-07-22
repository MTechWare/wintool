// c:\Users\userv\OneDrive - Southeast Community College\wintool-MAIN\src\tabs\tweaks\script.js

// c:\Users\userv\OneDrive - Southeast Community College\wintool-MAIN\src\tabs\tweaks\script.js

// Tweak ID to display name mapping (will be populated from the tweaks array)
let tweakDisplayNames = {};

// Enhanced Preset configurations for Windows Tweaks
const tweakPresets = {
    beginner: {
        name: 'Beginner Safe',
        description: 'Perfect first step - completely safe tweaks for new users',
        tweaks: [
            'show-file-extensions',
            'disable-startup-delay',
            'cleanup-temp-files',
            'disk-cleanup',
            'disable-consumer-features',
            'disable-advertising-comprehensive',
            'edge-debloat',
            'disable-gamedvr',
            'disable-hibernation',
            'disable-fast-startup'
        ]
    },
    privacy: {
        name: 'Privacy Shield',
        description: 'Complete privacy protection - stops all tracking and data collection',
        tweaks: [
            'disable-telemetry-comprehensive',
            'disable-activity-history',
            'disable-location-tracking',
            'disable-advertising-comprehensive',
            'disable-cortana',
            'disable-web-search-start-menu',
            'disable-windows-spotlight',
            'disable-windows-tips',
            'disable-news-interests',
            'disable-error-reporting',
            'edge-debloat',
            'disable-onedrive',
            'disable-meet-now',
            'disable-people-taskbar',
            'show-hidden-files'
        ]
    },
    debloat: {
        name: 'Ultimate Debloat',
        description: 'Removes all Windows bloatware and unnecessary features',
        tweaks: [
            'remove-bloatware-apps',
            'disable-telemetry-comprehensive',
            'disable-advertising-comprehensive',
            'disable-cortana',
            'disable-web-search-start-menu',
            'disable-onedrive',
            'disable-consumer-features',
            'disable-windows-spotlight',
            'disable-windows-tips',
            'disable-news-interests',
            'disable-meet-now',
            'disable-people-taskbar',
            'disable-task-view',
            'edge-debloat',
            'disable-gamedvr',
            'cleanup-temp-files',
            'disk-cleanup',
            'show-file-extensions',
            'show-hidden-files'
        ]
    },
    performance: {
        name: 'Performance Beast',
        description: 'Maximum system performance and responsiveness',
        tweaks: [
            'disable-startup-delay',
            'disable-hibernation',
            'disable-fast-startup',
            'cleanup-temp-files',
            'disk-cleanup',
            'disable-gamedvr',
            'remove-bloatware-apps',
            'disable-telemetry-comprehensive',
            'disable-advertising-comprehensive',
            'disable-windows-defender-realtime',
            'disable-fax-service',
            'disable-windows-media-player-service',
            'disable-tablet-input-service',
            'disable-remote-registry',
            'disable-secondary-logon',
            'disable-windows-update-automatic'
        ]
    },
    gaming: {
        name: 'Gaming Powerhouse',
        description: 'Optimized specifically for gaming performance and low latency',
        tweaks: [
            'disable-gamedvr',
            'disable-startup-delay',
            'disable-hibernation',
            'disable-fast-startup',
            'cleanup-temp-files',
            'disk-cleanup',
            'remove-bloatware-apps',
            'disable-windows-defender-realtime',
            'disable-telemetry-comprehensive',
            'disable-advertising-comprehensive',
            'disable-cortana',
            'disable-web-search-start-menu',
            'disable-news-interests',
            'disable-windows-spotlight',
            'disable-windows-tips',
            'disable-fax-service',
            'disable-windows-media-player-service',
            'disable-tablet-input-service',
            'disable-windows-update-automatic'
        ]
    },
    windows11: {
        name: 'Windows 11 Makeover',
        description: 'Transforms Windows 11 back to a cleaner, Windows 10-like experience',
        tweaks: [
            'classic-context-menu',
            'taskbar-left-align',
            'disable-rounded-corners',
            'disable-news-interests',
            'disable-meet-now',
            'disable-people-taskbar',
            'disable-task-view',
            'remove-bloatware-apps',
            'disable-telemetry-comprehensive',
            'disable-advertising-comprehensive',
            'disable-cortana',
            'disable-web-search-start-menu',
            'disable-windows-spotlight',
            'disable-windows-tips',
            'edge-debloat',
            'show-file-extensions',
            'show-hidden-files',
            'disable-consumer-features'
        ]
    },
    enterprise: {
        name: 'Enterprise Clean',
        description: 'Professional setup for business environments and power users',
        tweaks: [
            'disable-telemetry-comprehensive',
            'disable-advertising-comprehensive',
            'disable-consumer-features',
            'remove-bloatware-apps',
            'disable-cortana',
            'disable-web-search-start-menu',
            'disable-onedrive',
            'disable-windows-spotlight',
            'disable-windows-tips',
            'disable-news-interests',
            'disable-meet-now',
            'disable-people-taskbar',
            'edge-debloat',
            'show-file-extensions',
            'show-hidden-files',
            'disable-startup-delay',
            'cleanup-temp-files',
            'disable-gamedvr',
            'disable-error-reporting'
        ]
    },
    extreme: {
        name: 'Nuclear Option',
        description: '⚠️ EXTREME - Maximum debloating with system modifications (EXPERTS ONLY)',
        tweaks: [
            'remove-bloatware-apps',
            'disable-telemetry-comprehensive',
            'disable-advertising-comprehensive',
            'disable-windows-search-service',
            'disable-windows-security-notifications',
            'remove-edge-completely',
            'disable-cortana',
            'disable-onedrive',
            'disable-windows-spotlight',
            'disable-windows-tips',
            'disable-news-interests',
            'disable-meet-now',
            'disable-people-taskbar',
            'disable-task-view',
            'disable-lock-screen',
            'disable-secondary-logon',
            'disable-fax-service',
            'disable-windows-media-player-service',
            'disable-tablet-input-service',
            'disable-remote-registry',
            'disable-windows-defender-realtime',
            'disable-windows-update-automatic',
            'classic-context-menu',
            'taskbar-left-align',
            'disable-rounded-corners'
        ]
    }
};

// Simple inline batch checker implementation
class SimpleBatchChecker {
    constructor() {
        this.registryChecks = [];
        this.results = new Map();
    }

    addRegistryCheck(key, path, name, expectedValue) {
        this.registryChecks.push({ key, path, name, expectedValue });
    }

    async executeRegistryChecks() {
        if (this.registryChecks.length === 0) {
            return {};
        }

        try {
            // Build a single PowerShell command to check multiple registry values
            const commands = this.registryChecks.map(check =>
                `try { $result = reg query "${check.path}" /v "${check.name}" 2>$null; if ($LASTEXITCODE -eq 0) { Write-Output "${check.key}:SUCCESS:$result" } else { Write-Output "${check.key}:NOTFOUND:" } } catch { Write-Output "${check.key}:ERROR:" }`
            );

            const psCommand = commands.join('; ');
            const result = await window.electronAPI.executePowerShell(psCommand);

            const results = {};
            if (result) {
                const lines = result.split('\n');
                lines.forEach(line => {
                    const parts = line.trim().split(':');
                    if (parts.length >= 3) {
                        const key = parts[0];
                        const status = parts[1];
                        const output = parts.slice(2).join(':');

                        const check = this.registryChecks.find(c => c.key === key);
                        if (check) {
                            const isMatch = status === 'SUCCESS' && output.includes(check.expectedValue);
                            results[key] = {
                                found: status === 'SUCCESS',
                                matches: isMatch,
                                output: output
                            };
                            this.results.set(key, results[key]);
                        }
                    }
                });
            }

            return results;
        } catch (error) {
            console.error('Batch registry check failed:', error);
            // Return empty results on failure
            const emptyResults = {};
            this.registryChecks.forEach(check => {
                emptyResults[check.key] = { found: false, matches: false, output: null };
                this.results.set(check.key, emptyResults[check.key]);
            });
            return emptyResults;
        }
    }

    isRegistryCheckMatched(key) {
        const result = this.results.get(key);
        return result ? result.matches : false;
    }
}

// Make it available globally
window.SimpleBatchChecker = SimpleBatchChecker;

const tweaksGrid = document.getElementById('tweaks-grid');

// Global batch checker instance and caching
let globalBatchChecker = null;
let batchCheckResults = new Map();
let tweakStatusCache = new Map();
let cacheTimestamp = 0;
const CACHE_DURATION = 30000; // 30 seconds cache

// Helper function to safely check registry values
async function checkRegistryValue(keyPath, valueName, expectedValue) {
    try {
        const command = `reg query "${keyPath}" /v "${valueName}"`;
        const result = await window.electronAPI.executePowerShell(command);
        return result.includes(`${valueName}    REG_DWORD    ${expectedValue}`);
    } catch (error) {
        // If registry key/value doesn't exist, treat as not applied
        if (error.message.includes('unable to find the specified registry key or value')) {
            return false;
        }
        throw error;
    }
}

// Helper function to safely check registry key existence
async function checkRegistryKey(keyPath) {
    try {
        const command = `reg query "${keyPath}"`;
        const result = await window.electronAPI.executePowerShell(command);
        return !result.includes('ERROR');
    } catch (error) {
        // If registry key doesn't exist, return false
        if (error.message.includes('unable to find the specified registry key or value')) {
            return false;
        }
        throw error;
    }
}

// Global tweaks array - accessible to all functions
const tweaks = [
    // ===== ESSENTIAL TWEAKS (SAFE) =====
    {
        id: 'disable-activity-history',
        title: 'Disable Activity History',
        category: '🟢 Essential Tweaks',
        description: 'Disables Windows Activity History that tracks recent documents, clipboard, and run history.',
        safety: 'safe',
        batchCheck: {
            type: 'registry',
            path: 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System',
            name: 'EnableActivityFeed',
            expectedValue: 'EnableActivityFeed    REG_DWORD    0x0'
        },
        check: async () => {
            return await checkRegistryValue(
                'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System',
                'EnableActivityFeed',
                '0x0'
            );
        },
        apply: async () => {
            const commands = [
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v "EnableActivityFeed" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v "PublishUserActivities" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v "UploadUserActivities" /t REG_DWORD /d 0 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v "EnableActivityFeed" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v "PublishUserActivities" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v "UploadUserActivities" /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'disable-cortana',
        title: 'Disable Cortana',
        category: '🟢 Essential Tweaks',
        description: 'Disables the Cortana voice assistant and related services.',
        safety: 'safe',
        batchCheck: {
            type: 'registry',
            path: 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search',
            name: 'AllowCortana',
            expectedValue: 'AllowCortana    REG_DWORD    0x0'
        },
        check: async () => {
            return await checkRegistryValue(
                'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search',
                'AllowCortana',
                '0x0'
            );
        },
        apply: async () => {
            const commands = [
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v "AllowCortana" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v "DisableWebSearch" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v "ConnectedSearchUseWeb" /t REG_DWORD /d 0 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v "AllowCortana" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v "DisableWebSearch" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v "ConnectedSearchUseWeb" /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'disable-consumer-features',
        title: 'Disable Consumer Features',
        category: '🟢 Essential Tweaks',
        description: 'Prevents Windows from automatically installing games, third-party apps, or application links from the Windows Store.',
        safety: 'safe',
        batchCheck: {
            type: 'registry',
            path: 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent',
            name: 'DisableWindowsConsumerFeatures',
            expectedValue: 'DisableWindowsConsumerFeatures    REG_DWORD    0x1'
        },
        check: async () => {
            return await checkRegistryValue(
                'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent',
                'DisableWindowsConsumerFeatures',
                '0x1'
            );
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v "DisableWindowsConsumerFeatures" /t REG_DWORD /d 1 /f');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v "DisableWindowsConsumerFeatures" /f');
        }
    },
    {
        id: 'disable-location-tracking',
        title: 'Disable Location Tracking',
        category: '🟢 Essential Tweaks',
        description: 'Disables Windows location tracking and related services for enhanced privacy.',
        safety: 'safe',
        batchCheck: {
            type: 'registry',
            path: 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location',
            name: 'Value',
            expectedValue: 'Value    REG_SZ    Deny'
        },
        check: async () => {
            const command = 'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location" /v "Value"';
            const result = await window.electronAPI.executePowerShell(command);
            return result.includes('Value    REG_SZ    Deny');
        },
        apply: async () => {
            const commands = [
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location" /v "Value" /t REG_SZ /d "Deny" /f',
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Sensor\\Overrides\\{BFA794E4-F964-4FDB-90F6-51056BFE4B44}" /v "SensorPermissionState" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\lfsvc\\Service\\Configuration" /v "Status" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SYSTEM\\Maps" /v "AutoUpdateEnabled" /t REG_DWORD /d 0 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location" /v "Value" /t REG_SZ /d "Allow" /f',
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Sensor\\Overrides\\{BFA794E4-F964-4FDB-90F6-51056BFE4B44}" /v "SensorPermissionState" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\lfsvc\\Service\\Configuration" /v "Status" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SYSTEM\\Maps" /v "AutoUpdateEnabled" /t REG_DWORD /d 1 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'disable-hibernation',
        title: 'Disable Hibernation',
        category: '🟢 Essential Tweaks',
        description: 'Disables hibernation to free up disk space. Hibernation is mainly useful for laptops.',
        safety: 'safe',
        check: async () => {
            const command = 'powercfg /query | findstr "Hibernate"';
            const result = await window.electronAPI.executePowerShell(command);
            return !result.includes('Hibernate After');
        },
        apply: async () => {
            const commands = [
                'powercfg.exe /hibernate off',
                'reg add "HKLM\\System\\CurrentControlSet\\Control\\Session Manager\\Power" /v "HibernateEnabled" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FlyoutMenuSettings" /v "ShowHibernateOption" /t REG_DWORD /d 0 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'powercfg.exe /hibernate on',
                'reg add "HKLM\\System\\CurrentControlSet\\Control\\Session Manager\\Power" /v "HibernateEnabled" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FlyoutMenuSettings" /v "ShowHibernateOption" /t REG_DWORD /d 1 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'edge-debloat',
        title: 'Debloat Microsoft Edge',
        category: '🟢 Essential Tweaks',
        description: 'Disables various telemetry options, popups, and annoying features in Microsoft Edge.',
        safety: 'safe',
        batchCheck: {
            type: 'registry',
            path: 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge',
            name: 'PersonalizationReportingEnabled',
            expectedValue: 'PersonalizationReportingEnabled    REG_DWORD    0x0'
        },
        check: async () => {
            return await checkRegistryValue(
                'HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge',
                'PersonalizationReportingEnabled',
                '0x0'
            );
        },
        apply: async () => {
            const commands = [
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\EdgeUpdate" /v "CreateDesktopShortcutDefault" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v "PersonalizationReportingEnabled" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v "ShowRecommendationsEnabled" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v "HideFirstRunExperience" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v "UserFeedbackAllowed" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v "ConfigureDoNotTrack" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v "EdgeShoppingAssistantEnabled" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v "ShowMicrosoftRewards" /t REG_DWORD /d 0 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\EdgeUpdate" /v "CreateDesktopShortcutDefault" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v "PersonalizationReportingEnabled" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v "ShowRecommendationsEnabled" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v "HideFirstRunExperience" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v "UserFeedbackAllowed" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v "ConfigureDoNotTrack" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v "EdgeShoppingAssistantEnabled" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v "ShowMicrosoftRewards" /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'disable-gamedvr',
        title: 'Disable GameDVR',
        category: '🟢 Essential Tweaks',
        description: 'Disables Windows GameDVR which can impact gaming performance.',
        safety: 'safe',
        batchCheck: {
            type: 'registry',
            path: 'HKCU\\System\\GameConfigStore',
            name: 'GameDVR_Enabled',
            expectedValue: 'GameDVR_Enabled    REG_DWORD    0x0'
        },
        check: async () => {
            const command = 'reg query "HKCU\\System\\GameConfigStore" /v "GameDVR_Enabled"';
            const result = await window.electronAPI.executePowerShell(command);
            return result.includes('GameDVR_Enabled    REG_DWORD    0x0');
        },
        apply: async () => {
            const commands = [
                'reg add "HKCU\\System\\GameConfigStore" /v "GameDVR_FSEBehavior" /t REG_DWORD /d 2 /f',
                'reg add "HKCU\\System\\GameConfigStore" /v "GameDVR_Enabled" /t REG_DWORD /d 0 /f',
                'reg add "HKCU\\System\\GameConfigStore" /v "GameDVR_HonorUserFSEBehaviorMode" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\System\\GameConfigStore" /v "GameDVR_EFSEFeatureFlags" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR" /v "AllowGameDVR" /t REG_DWORD /d 0 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg add "HKCU\\System\\GameConfigStore" /v "GameDVR_FSEBehavior" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\System\\GameConfigStore" /v "GameDVR_Enabled" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\System\\GameConfigStore" /v "GameDVR_HonorUserFSEBehaviorMode" /t REG_DWORD /d 0 /f',
                'reg add "HKCU\\System\\GameConfigStore" /v "GameDVR_EFSEFeatureFlags" /t REG_DWORD /d 1 /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR" /v "AllowGameDVR" /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'cleanup-temp-files',
        title: 'Clean Temporary Files',
        category: '🟢 Essential Tweaks',
        description: 'Cleans temporary files from Windows and user temp directories.',
        safety: 'safe',
        check: async () => {
            // This is a one-time action, so we'll always show it as available
            return false;
        },
        apply: async () => {
            const commands = [
                'powershell -Command "Get-ChildItem -Path \\"C:\\\\Windows\\\\Temp\\" -Recurse -Force | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue"',
                'powershell -Command "Get-ChildItem -Path $env:TEMP -Recurse -Force | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue"'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            // Cannot revert file deletion
            console.log('Cannot revert temporary file cleanup');
        }
    },
    {
        id: 'disk-cleanup',
        title: 'Run Disk Cleanup',
        category: '🟢 Essential Tweaks',
        description: 'Runs Windows Disk Cleanup and removes old Windows Updates.',
        safety: 'safe',
        check: async () => {
            // This is a one-time action, so we'll always show it as available
            return false;
        },
        apply: async () => {
            const commands = [
                'cleanmgr.exe /d C: /VERYLOWDISK',
                'Dism.exe /online /Cleanup-Image /StartComponentCleanup /ResetBase'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            // Cannot revert disk cleanup
            console.log('Cannot revert disk cleanup');
        }
    },
    {
        id: 'show-file-extensions',
        title: 'Show File Extensions',
        category: '🟢 Essential Tweaks',
        description: 'Shows file extensions in File Explorer for better file identification.',
        safety: 'safe',
        check: async () => {
            const command = 'reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "HideFileExt"';
            const result = await window.electronAPI.executePowerShell(command);
            return result.includes('HideFileExt    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "HideFileExt" /t REG_DWORD /d 0 /f');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "HideFileExt" /t REG_DWORD /d 1 /f');
        }
    },
    {
        id: 'disable-windows-defender-realtime',
        title: 'Disable Windows Defender Real-time Protection',
        category: '🟢 Essential Tweaks',
        description: 'Disables Windows Defender real-time protection. WARNING: Only disable if you have alternative antivirus.',
        safety: 'caution',
        check: async () => {
            return await checkRegistryValue(
                'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Real-Time Protection',
                'DisableRealtimeMonitoring',
                '0x1'
            );
        },
        apply: async () => {
            const commands = [
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Real-Time Protection" /v "DisableRealtimeMonitoring" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows Defender" /v "DisableAntiSpyware" /t REG_DWORD /d 1 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Real-Time Protection" /v "DisableRealtimeMonitoring" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows Defender" /v "DisableAntiSpyware" /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'disable-windows-update-automatic',
        title: 'Disable Automatic Windows Updates',
        category: '🟢 Essential Tweaks',
        description: 'Disables automatic Windows Updates. You can still manually check for updates.',
        safety: 'caution',
        check: async () => {
            return await checkRegistryValue(
                'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU',
                'NoAutoUpdate',
                '0x1'
            );
        },
        apply: async () => {
            const commands = [
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" /v "NoAutoUpdate" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" /v "AUOptions" /t REG_DWORD /d 2 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" /v "NoAutoUpdate" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" /v "AUOptions" /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'disable-fast-startup',
        title: 'Disable Fast Startup',
        category: '🟢 Essential Tweaks',
        description: 'Disables Windows Fast Startup which can cause issues with dual-boot systems and some hardware.',
        safety: 'safe',
        check: async () => {
            const command = 'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power" /v "HiberbootEnabled"';
            const result = await window.electronAPI.executePowerShell(command);
            return result.includes('HiberbootEnabled    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power" /v "HiberbootEnabled" /t REG_DWORD /d 0 /f');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power" /v "HiberbootEnabled" /t REG_DWORD /d 1 /f');
        }
    },
    {
        id: 'disable-startup-delay',
        title: 'Disable Startup Delay',
        category: '🟢 Essential Tweaks',
        description: 'Removes the 10-second delay before startup programs launch, making boot faster.',
        safety: 'safe',
        check: async () => {
            return await checkRegistryValue(
                'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize',
                'StartupDelayInMSec',
                '0x0'
            );
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize" /v "StartupDelayInMSec" /t REG_DWORD /d 0 /f');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('reg delete "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize" /v "StartupDelayInMSec" /f');
        }
    },
    {
        id: 'disable-error-reporting',
        title: 'Disable Windows Error Reporting',
        category: '🟢 Essential Tweaks',
        description: 'Disables Windows Error Reporting to prevent sending crash data to Microsoft.',
        safety: 'safe',
        check: async () => {
            const command = 'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\Windows Error Reporting" /v "Disabled"';
            const result = await window.electronAPI.executePowerShell(command);
            return result.includes('Disabled    REG_DWORD    0x1');
        },
        apply: async () => {
            const commands = [
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\Windows Error Reporting" /v "Disabled" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Error Reporting" /v "Disabled" /t REG_DWORD /d 1 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows\\Windows Error Reporting" /v "Disabled" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Error Reporting" /v "Disabled" /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },

    // ===== COMPREHENSIVE DEBLOATING TWEAKS =====
    {
        id: 'disable-telemetry-comprehensive',
        title: 'Comprehensive Telemetry Disable',
        category: '🟢 Essential Tweaks',
        description: 'Completely disables Windows telemetry, diagnostic data collection, and usage tracking.',
        safety: 'safe',
        batchCheck: {
            type: 'registry',
            path: 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection',
            name: 'AllowTelemetry',
            expectedValue: 'AllowTelemetry    REG_DWORD    0x0'
        },
        check: async () => {
            return await checkRegistryValue(
                'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection',
                'AllowTelemetry',
                '0x0'
            );
        },
        apply: async () => {
            const commands = [
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v "AllowTelemetry" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v "DoNotShowFeedbackNotifications" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v "AllowCommercialDataPipeline" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v "AllowDeviceNameInTelemetry" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\DataCollection" /v "AllowTelemetry" /t REG_DWORD /d 0 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Privacy" /v "TailoredExperiencesWithDiagnosticDataEnabled" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Diagnostics\\DiagTrack\\EventTranscriptKey" /v "EnableEventTranscript" /t REG_DWORD /d 0 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v "AllowTelemetry" /t REG_DWORD /d 3 /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v "DoNotShowFeedbackNotifications" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v "AllowCommercialDataPipeline" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v "AllowDeviceNameInTelemetry" /f',
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\DataCollection" /v "AllowTelemetry" /t REG_DWORD /d 3 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Privacy" /v "TailoredExperiencesWithDiagnosticDataEnabled" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Diagnostics\\DiagTrack\\EventTranscriptKey" /v "EnableEventTranscript" /t REG_DWORD /d 1 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'disable-advertising-comprehensive',
        title: 'Disable All Advertising Features',
        category: '🟢 Essential Tweaks',
        description: 'Disables advertising ID, personalized ads, app suggestions, and promotional content.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" /v "Enabled"');
            return result.stdout.includes('Enabled    REG_DWORD    0x0');
        },
        apply: async () => {
            const commands = [
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" /v "Enabled" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AdvertisingInfo" /v "DisabledByGroupPolicy" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SilentInstalledAppsEnabled" /t REG_DWORD /d 0 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SystemPaneSuggestionsEnabled" /t REG_DWORD /d 0 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SoftLandingEnabled" /t REG_DWORD /d 0 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "RotatingLockScreenEnabled" /t REG_DWORD /d 0 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "RotatingLockScreenOverlayEnabled" /t REG_DWORD /d 0 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SubscribedContent-310093Enabled" /t REG_DWORD /d 0 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SubscribedContent-338387Enabled" /t REG_DWORD /d 0 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SubscribedContent-338388Enabled" /t REG_DWORD /d 0 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SubscribedContent-338389Enabled" /t REG_DWORD /d 0 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SubscribedContent-338393Enabled" /t REG_DWORD /d 0 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SubscribedContent-353694Enabled" /t REG_DWORD /d 0 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SubscribedContent-353696Enabled" /t REG_DWORD /d 0 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" /v "Enabled" /t REG_DWORD /d 1 /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AdvertisingInfo" /v "DisabledByGroupPolicy" /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SilentInstalledAppsEnabled" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SystemPaneSuggestionsEnabled" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SoftLandingEnabled" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "RotatingLockScreenEnabled" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "RotatingLockScreenOverlayEnabled" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SubscribedContent-310093Enabled" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SubscribedContent-338387Enabled" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SubscribedContent-338388Enabled" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SubscribedContent-338389Enabled" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SubscribedContent-338393Enabled" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SubscribedContent-353694Enabled" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SubscribedContent-353696Enabled" /t REG_DWORD /d 1 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'remove-bloatware-apps',
        title: 'Remove Windows Bloatware Apps',
        category: '🟢 Essential Tweaks',
        description: 'Removes common Windows bloatware apps like Candy Crush, Xbox apps, and other unnecessary software.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('powershell -Command "Get-AppxPackage *CandyCrush* | Select-Object Name"');
            return !result.stdout.includes('CandyCrushSodaSaga');
        },
        apply: async () => {
            const powershellScript = `
                    $apps = @(
                        "*3DBuilder*",
                        "*Appconnector*",
                        "*BingFinance*",
                        "*BingNews*",
                        "*BingSports*",
                        "*BingTranslator*",
                        "*BingWeather*",
                        "*CandyCrush*",
                        "*CommsPhone*",
                        "*ConnectivityStore*",
                        "*ContactSupport*",
                        "*FarmVille*",
                        "*Feedback*",
                        "*Getstarted*",
                        "*Messaging*",
                        "*Microsoft3DViewer*",
                        "*MicrosoftOfficeHub*",
                        "*MicrosoftSolitaireCollection*",
                        "*MicrosoftStickyNotes*",
                        "*MixedReality.Portal*",
                        "*OneNote*",
                        "*People*",
                        "*Print3D*",
                        "*SkypeApp*",
                        "*Todos*",
                        "*Twitter*",
                        "*WindowsAlarms*",
                        "*WindowsCamera*",
                        "*windowscommunicationsapps*",
                        "*WindowsFeedbackHub*",
                        "*WindowsMaps*",
                        "*WindowsPhone*",
                        "*WindowsSoundRecorder*",
                        "*XboxApp*",
                        "*XboxGameOverlay*",
                        "*XboxGamingOverlay*",
                        "*XboxIdentityProvider*",
                        "*XboxSpeechToTextOverlay*",
                        "*ZuneMusic*",
                        "*ZuneVideo*"
                    )
                    foreach ($app in $apps) {
                        Get-AppxPackage $app -AllUsers | Remove-AppxPackage -ErrorAction SilentlyContinue
                        Get-AppxProvisionedPackage -Online | Where-Object DisplayName -like $app | Remove-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue
                    }
                `;
            await window.electronAPI.runAdminCommand(`powershell -Command "${powershellScript}"`);
        },
        revert: async () => {
            console.log('Cannot revert app removal - apps would need to be reinstalled from Microsoft Store');
        }
    },
    {
        id: 'disable-web-search-start-menu',
        title: 'Disable Web Search in Start Menu',
        category: '🟢 Essential Tweaks',
        description: 'Prevents Start Menu from searching the web and showing web results.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search" /v "BingSearchEnabled"');
            return result.stdout.includes('BingSearchEnabled    REG_DWORD    0x0');
        },
        apply: async () => {
            const commands = [
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search" /v "BingSearchEnabled" /t REG_DWORD /d 0 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search" /v "CortanaConsent" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v "DisableWebSearch" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v "ConnectedSearchUseWeb" /t REG_DWORD /d 0 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search" /v "BingSearchEnabled" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search" /v "CortanaConsent" /t REG_DWORD /d 1 /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v "DisableWebSearch" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v "ConnectedSearchUseWeb" /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'disable-onedrive',
        title: 'Disable OneDrive Integration',
        category: '🟢 Essential Tweaks',
        description: 'Disables OneDrive integration and prevents it from starting automatically.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\OneDrive" /v "DisableFileSyncNGSC"');
            return result.stdout.includes('DisableFileSyncNGSC    REG_DWORD    0x1');
        },
        apply: async () => {
            const commands = [
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\OneDrive" /v "DisableFileSyncNGSC" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\OneDrive" /v "DisableFileSync" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "ShowSyncProviderNotifications" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FolderDescriptions\\{A52BBA46-E9E1-435f-B3D9-28DAA648C0F6}" /v "PropertyBag" /t REG_DWORD /d 0 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\OneDrive" /v "DisableFileSyncNGSC" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\OneDrive" /v "DisableFileSync" /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "ShowSyncProviderNotifications" /t REG_DWORD /d 1 /f',
                'reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FolderDescriptions\\{A52BBA46-E9E1-435f-B3D9-28DAA648C0F6}" /v "PropertyBag" /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },

    // ===== ADVANCED DEBLOATING TWEAKS =====
    {
        id: 'disable-windows-spotlight',
        title: 'Disable Windows Spotlight',
        category: '🟡 Advanced Tweaks',
        description: 'Disables Windows Spotlight lock screen images and suggestions.',
        safety: 'caution',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v "DisableWindowsSpotlightFeatures"');
            return result.stdout.includes('DisableWindowsSpotlightFeatures    REG_DWORD    0x1');
        },
        apply: async () => {
            const commands = [
                'reg add "HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v "DisableWindowsSpotlightFeatures" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v "ConfigureWindowsSpotlight" /t REG_DWORD /d 2 /f',
                'reg add "HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v "IncludeEnterpriseSpotlight" /t REG_DWORD /d 0 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "RotatingLockScreenEnabled" /t REG_DWORD /d 0 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v "DisableWindowsSpotlightFeatures" /f',
                'reg delete "HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v "ConfigureWindowsSpotlight" /f',
                'reg delete "HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v "IncludeEnterpriseSpotlight" /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "RotatingLockScreenEnabled" /t REG_DWORD /d 1 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'disable-windows-tips',
        title: 'Disable Windows Tips and Suggestions',
        category: '🟡 Advanced Tweaks',
        description: 'Disables Windows tips, suggestions, and "Get even more out of Windows" notifications.',
        safety: 'caution',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v "DisableSoftLanding"');
            return result.stdout.includes('DisableSoftLanding    REG_DWORD    0x1');
        },
        apply: async () => {
            const commands = [
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v "DisableSoftLanding" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v "DisableWindowsSpotlightOnActionCenter" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v "DisableWindowsSpotlightOnSettings" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v "DisableWindowsSpotlightWindowsWelcomeExperience" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SubscribedContent-338389Enabled" /t REG_DWORD /d 0 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v "DisableSoftLanding" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v "DisableWindowsSpotlightOnActionCenter" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v "DisableWindowsSpotlightOnSettings" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v "DisableWindowsSpotlightWindowsWelcomeExperience" /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SubscribedContent-338389Enabled" /t REG_DWORD /d 1 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'disable-news-interests',
        title: 'Disable News and Interests (Widgets)',
        category: '🟡 Advanced Tweaks',
        description: 'Disables the News and Interests widget in the taskbar (Windows 11 Widgets).',
        safety: 'caution',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Dsh" /v "AllowNewsAndInterests"');
            return result.stdout.includes('AllowNewsAndInterests    REG_DWORD    0x0');
        },
        apply: async () => {
            const commands = [
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Dsh" /v "AllowNewsAndInterests" /t REG_DWORD /d 0 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Feeds" /v "ShellFeedsTaskbarViewMode" /t REG_DWORD /d 2 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Feeds" /v "EnableFeeds" /t REG_DWORD /d 0 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Dsh" /v "AllowNewsAndInterests" /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Feeds" /v "ShellFeedsTaskbarViewMode" /t REG_DWORD /d 0 /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Feeds" /v "EnableFeeds" /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'disable-meet-now',
        title: 'Remove Meet Now from Taskbar',
        category: '🟡 Advanced Tweaks',
        description: 'Removes the Meet Now (Skype) button from the system tray.',
        safety: 'caution',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v "HideSCAMeetNow"');
            return result.stdout.includes('HideSCAMeetNow    REG_DWORD    0x1');
        },
        apply: async () => {
            const commands = [
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v "HideSCAMeetNow" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v "HideSCAMeetNow" /t REG_DWORD /d 1 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v "HideSCAMeetNow" /f',
                'reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v "HideSCAMeetNow" /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'disable-people-taskbar',
        title: 'Remove People from Taskbar',
        category: '🟡 Advanced Tweaks',
        description: 'Removes the People button from the taskbar.',
        safety: 'caution',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced\\People" /v "PeopleBand"');
            return result.stdout.includes('PeopleBand    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced\\People" /v "PeopleBand" /t REG_DWORD /d 0 /f');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced\\People" /v "PeopleBand" /t REG_DWORD /d 1 /f');
        }
    },
    {
        id: 'disable-task-view',
        title: 'Remove Task View from Taskbar',
        category: '🟡 Advanced Tweaks',
        description: 'Removes the Task View button from the taskbar.',
        safety: 'caution',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "ShowTaskViewButton"');
            return result.stdout.includes('ShowTaskViewButton    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "ShowTaskViewButton" /t REG_DWORD /d 0 /f');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "ShowTaskViewButton" /t REG_DWORD /d 1 /f');
        }
    },

    // ===== EXTREME DEBLOATING TWEAKS =====
    {
        id: 'disable-windows-search-service',
        title: 'Disable Windows Search Service',
        category: '🔴 Extreme Tweaks',
        description: 'Completely disables Windows Search indexing service. WARNING: This will break Start Menu search.',
        safety: 'danger',
        check: async () => {
            const result = await window.electronAPI.runCommand('sc query "WSearch"');
            return result.stdout.includes('STATE              : 1  STOPPED');
        },
        apply: async () => {
            const commands = [
                'sc config "WSearch" start= disabled',
                'sc stop "WSearch"',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\WSearch" /v "Start" /t REG_DWORD /d 4 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'sc config "WSearch" start= auto',
                'sc start "WSearch"',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\WSearch" /v "Start" /t REG_DWORD /d 2 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'disable-windows-security-notifications',
        title: 'Disable Windows Security Notifications',
        category: '🔴 Extreme Tweaks',
        description: 'Disables all Windows Security notifications and warnings. WARNING: This reduces security awareness.',
        safety: 'danger',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows Defender Security Center\\Notifications" /v "DisableNotifications"');
            return result.stdout.includes('DisableNotifications    REG_DWORD    0x1');
        },
        apply: async () => {
            const commands = [
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows Defender Security Center\\Notifications" /v "DisableNotifications" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows Defender Security Center\\Notifications" /v "DisableEnhancedNotifications" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings\\Windows.SystemToast.SecurityAndMaintenance" /v "Enabled" /t REG_DWORD /d 0 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows Defender Security Center\\Notifications" /v "DisableNotifications" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows Defender Security Center\\Notifications" /v "DisableEnhancedNotifications" /f',
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings\\Windows.SystemToast.SecurityAndMaintenance" /v "Enabled" /t REG_DWORD /d 1 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'remove-edge-completely',
        title: 'Remove Microsoft Edge (Extreme)',
        category: '🔴 Extreme Tweaks',
        description: 'Attempts to completely remove Microsoft Edge from the system. WARNING: This may break some Windows features.',
        safety: 'danger',
        check: async () => {
            const result = await window.electronAPI.runCommand('where msedge');
            return result.stderr.includes('Could not find');
        },
        apply: async () => {
            const powershellScript = `
                    $EdgePath = "\${env:ProgramFiles(x86)}\\Microsoft\\Edge\\Application"
                    if (Test-Path $EdgePath) {
                        $EdgeInstaller = Get-ChildItem -Path $EdgePath -Filter "setup.exe" -Recurse | Select-Object -First 1
                        if ($EdgeInstaller) {
                            Start-Process -FilePath $EdgeInstaller.FullName -ArgumentList "--uninstall", "--force-uninstall", "--system-level" -Wait
                        }
                    }
                    Get-AppxPackage *MicrosoftEdge* | Remove-AppxPackage -ErrorAction SilentlyContinue
                    reg add "HKLM\\SOFTWARE\\Microsoft\\EdgeUpdate" /v "DoNotUpdateToEdgeWithChromium" /t REG_DWORD /d 1 /f
                `;
            await window.electronAPI.runAdminCommand(`powershell -Command "${powershellScript}"`);
        },
        revert: async () => {
            console.log('Cannot automatically reinstall Microsoft Edge - manual reinstallation required');
        }
    },

    // ===== USELESS SERVICES SECTION =====
    {
        id: 'disable-fax-service',
        title: 'Disable Fax Service',
        category: '🔧 Useless Services',
        description: 'Disables the Windows Fax service which is rarely used on modern systems.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('sc query "Fax"');
            return result.stdout.includes('STATE              : 1  STOPPED');
        },
        apply: async () => {
            const commands = [
                'sc config "Fax" start= disabled',
                'sc stop "Fax"'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'sc config "Fax" start= manual',
                'sc start "Fax"'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'disable-windows-media-player-service',
        title: 'Disable Windows Media Player Network Service',
        category: '🔧 Useless Services',
        description: 'Disables Windows Media Player Network Sharing Service.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('sc query "WMPNetworkSvc"');
            return result.stdout.includes('STATE              : 1  STOPPED');
        },
        apply: async () => {
            const commands = [
                'sc config "WMPNetworkSvc" start= disabled',
                'sc stop "WMPNetworkSvc"'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'sc config "WMPNetworkSvc" start= manual',
                'sc start "WMPNetworkSvc"'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'disable-tablet-input-service',
        title: 'Disable Tablet PC Input Service',
        category: '🔧 Useless Services',
        description: 'Disables Tablet PC Input Service for non-tablet systems.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('sc query "TabletInputService"');
            return result.stdout.includes('STATE              : 1  STOPPED');
        },
        apply: async () => {
            const commands = [
                'sc config "TabletInputService" start= disabled',
                'sc stop "TabletInputService"'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'sc config "TabletInputService" start= auto',
                'sc start "TabletInputService"'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'disable-remote-registry',
        title: 'Disable Remote Registry Service',
        category: '🔧 Useless Services',
        description: 'Disables Remote Registry service for better security.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('sc query "RemoteRegistry"');
            return result.stdout.includes('STATE              : 1  STOPPED');
        },
        apply: async () => {
            const commands = [
                'sc config "RemoteRegistry" start= disabled',
                'sc stop "RemoteRegistry"'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'sc config "RemoteRegistry" start= manual',
                'sc start "RemoteRegistry"'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'disable-secondary-logon',
        title: 'Disable Secondary Logon Service',
        category: '🔧 Useless Services',
        description: 'Disables Secondary Logon service (RunAs functionality).',
        safety: 'caution',
        check: async () => {
            const result = await window.electronAPI.runCommand('sc query "seclogon"');
            return result.stdout.includes('STATE              : 1  STOPPED');
        },
        apply: async () => {
            const commands = [
                'sc config "seclogon" start= disabled',
                'sc stop "seclogon"'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'sc config "seclogon" start= manual',
                'sc start "seclogon"'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },

    // ===== UI CUSTOMIZATION TWEAKS =====
    {
        id: 'classic-context-menu',
        title: 'Enable Classic Context Menu (Windows 11)',
        category: '🔵 UI Customization',
        description: 'Restores the classic Windows 10-style context menu in Windows 11.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKCU\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32"');
            return result.stdout.includes('InprocServer32');
        },
        apply: async () => {
            const commands = [
                'reg add "HKCU\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32" /f /ve',
                'taskkill /f /im explorer.exe',
                'start explorer.exe'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKCU\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}" /f',
                'taskkill /f /im explorer.exe',
                'start explorer.exe'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'disable-rounded-corners',
        title: 'Disable Rounded Corners (Windows 11)',
        category: '🔵 UI Customization',
        description: 'Disables rounded corners on Windows 11 windows and menus.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\DWM" /v "UseWindowFrameStagingBuffer"');
            return result.stdout.includes('UseWindowFrameStagingBuffer    REG_DWORD    0x0');
        },
        apply: async () => {
            const commands = [
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\DWM" /v "UseWindowFrameStagingBuffer" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\DWM" /v "ForceEffectMode" /t REG_DWORD /d 1 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKCU\\SOFTWARE\\Microsoft\\Windows\\DWM" /v "UseWindowFrameStagingBuffer" /f',
                'reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows\\DWM" /v "ForceEffectMode" /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'taskbar-left-align',
        title: 'Left-Align Taskbar (Windows 11)',
        category: '🔵 UI Customization',
        description: 'Moves the taskbar icons to the left side like Windows 10.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "TaskbarAl"');
            return result.stdout.includes('TaskbarAl    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "TaskbarAl" /t REG_DWORD /d 0 /f');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "TaskbarAl" /t REG_DWORD /d 1 /f');
        }
    },
    {
        id: 'show-hidden-files',
        title: 'Show Hidden Files and Folders',
        category: '🔵 UI Customization',
        description: 'Shows hidden files and folders in File Explorer.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "Hidden"');
            return result.stdout.includes('Hidden    REG_DWORD    0x1');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "Hidden" /t REG_DWORD /d 1 /f');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "Hidden" /t REG_DWORD /d 2 /f');
        }
    },
    {
        id: 'disable-lock-screen',
        title: 'Disable Lock Screen',
        category: '🔵 UI Customization',
        description: 'Disables the Windows lock screen and goes directly to login.',
        safety: 'caution',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Personalization" /v "NoLockScreen"');
            return result.stdout.includes('NoLockScreen    REG_DWORD    0x1');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Personalization" /v "NoLockScreen" /t REG_DWORD /d 1 /f');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Personalization" /v "NoLockScreen" /f');
        }
    },
    {
        id: 'disable-customer-experience-program',
        title: 'Disable Customer Experience Improvement Program',
        category: '🟢 Essential Tweaks',
        description: 'Opts out of the Windows Customer Experience Improvement Program.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\SQMClient\\Windows" /v "CEIPEnable"');
            return result.stdout.includes('CEIPEnable    REG_DWORD    0x0');
        },
        apply: async () => {
            const commands = [
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\SQMClient\\Windows" /v "CEIPEnable" /t REG_DWORD /d 0 /f',
                'reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Sqm\\Windows" /v "CEIPEnable" /t REG_DWORD /d 0 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\SQMClient\\Windows" /v "CEIPEnable" /f',
                'reg delete "HKEY_CURRENT_USER\\Software\\Microsoft\\Sqm\\Windows" /v "CEIPEnable" /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'disable-feedback-notifications',
        title: 'Disable Feedback Notifications',
        category: '🟢 Essential Tweaks',
        description: 'Disables Windows feedback notifications and requests.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKEY_CURRENT_USER\\SOFTWARE\\Microsoft\\Siuf\\Rules" /v "NumberOfSIUFInPeriod"');
            return result.stdout.includes('NumberOfSIUFInPeriod    REG_DWORD    0x0');
        },
        apply: async () => {
            const commands = [
                'reg add "HKEY_CURRENT_USER\\SOFTWARE\\Microsoft\\Siuf\\Rules" /v "NumberOfSIUFInPeriod" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v "DoNotShowFeedbackNotifications" /t REG_DWORD /d 1 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKEY_CURRENT_USER\\SOFTWARE\\Microsoft\\Siuf\\Rules" /v "NumberOfSIUFInPeriod" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v "DoNotShowFeedbackNotifications" /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'disable-advertising-id',
        title: 'Disable Advertising ID',
        category: '🟢 Essential Tweaks',
        description: 'Disables Windows Advertising ID used for targeted advertising.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKEY_CURRENT_USER\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" /v "Enabled"');
            return result.stdout.includes('Enabled    REG_DWORD    0x0');
        },
        apply: async () => {
            const commands = [
                'reg add "HKEY_CURRENT_USER\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" /v "Enabled" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AdvertisingInfo" /v "DisabledByGroupPolicy" /t REG_DWORD /d 1 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg add "HKEY_CURRENT_USER\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" /v "Enabled" /t REG_DWORD /d 1 /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AdvertisingInfo" /v "DisabledByGroupPolicy" /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },

    // ===== UI CUSTOMIZATION TWEAKS =====
    {
        id: 'dark-theme-apps',
        title: 'Dark Theme for Apps',
        category: '🔵 UI Customization',
        description: 'Switches Windows applications to use dark theme.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v "AppsUseLightTheme"');
            return result.stdout.includes('AppsUseLightTheme    REG_DWORD    0x0');
        },
        apply: async () => {
            const commands = [
                'reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v "AppsUseLightTheme" /t REG_DWORD /d 0 /f',
                'reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v "SystemUsesLightTheme" /t REG_DWORD /d 0 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v "AppsUseLightTheme" /t REG_DWORD /d 1 /f',
                'reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v "SystemUsesLightTheme" /t REG_DWORD /d 1 /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'taskbar-search-disable',
        title: 'Disable Taskbar Search',
        category: '🔵 UI Customization',
        description: 'Removes the search box from the Windows taskbar.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Search" /v "SearchboxTaskbarMode"');
            return result.stdout.includes('SearchboxTaskbarMode    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Search" /v "SearchboxTaskbarMode" /t REG_DWORD /d 0 /f');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Search" /v "SearchboxTaskbarMode" /t REG_DWORD /d 1 /f');
        }
    },
    {
        id: 'taskbar-widgets-disable',
        title: 'Disable Taskbar Widgets',
        category: '🔵 UI Customization',
        description: 'Removes the widgets button from the Windows 11 taskbar.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "TaskbarDa"');
            return result.stdout.includes('TaskbarDa    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "TaskbarDa" /t REG_DWORD /d 0 /f');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "TaskbarDa" /t REG_DWORD /d 1 /f');
        }
    },
    {
        id: 'taskbar-alignment-left',
        title: 'Left-Align Taskbar Items',
        category: '🔵 UI Customization',
        description: 'Moves Windows 11 taskbar items to the left side (Windows 10 style).',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "TaskbarAl"');
            return result.stdout.includes('TaskbarAl    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "TaskbarAl" /t REG_DWORD /d 0 /f');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "TaskbarAl" /t REG_DWORD /d 1 /f');
        }
    },
    {
        id: 'disable-action-center',
        title: 'Disable Action Center',
        category: '🔵 UI Customization',
        description: 'Disables the Windows Action Center notification panel.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKEY_CURRENT_USER\\Software\\Policies\\Microsoft\\Windows\\Explorer" /v "DisableNotificationCenter"');
            return result.stdout.includes('DisableNotificationCenter    REG_DWORD    0x1');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Policies\\Microsoft\\Windows\\Explorer" /v "DisableNotificationCenter" /t REG_DWORD /d 1 /f');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('reg delete "HKEY_CURRENT_USER\\Software\\Policies\\Microsoft\\Windows\\Explorer" /v "DisableNotificationCenter" /f');
        }
    },
    {
        id: 'remove-3d-objects',
        title: 'Remove 3D Objects from File Explorer',
        category: '🔵 UI Customization',
        description: 'Removes the "3D Objects" folder from This PC in File Explorer.',
        safety: 'safe',
        check: async () => {
            // Check both 64-bit and 32-bit registry locations
            const result64 = await window.electronAPI.runCommand('reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\MyComputer\\NameSpace\\{0DB7E03F-FC29-4DC6-9020-FF41B59E513A}"');
            const result32 = await window.electronAPI.runCommand('reg query "HKLM\\SOFTWARE\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Explorer\\MyComputer\\NameSpace\\{0DB7E03F-FC29-4DC6-9020-FF41B59E513A}"');
            // If both commands fail, the keys don't exist, so the tweak is applied
            return !result64.success && !result32.success;
        },
        apply: async () => {
            // Remove from both locations to ensure complete removal
            const commands = [
                'reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\MyComputer\\NameSpace\\{0DB7E03F-FC29-4DC6-9020-FF41B59E513A}" /f',
                'reg delete "HKLM\\SOFTWARE\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Explorer\\MyComputer\\NameSpace\\{0DB7E03F-FC29-4DC6-9020-FF41B59E513A}" /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            // Restore the 3D Objects folder by recreating the registry keys
            const commands = [
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\MyComputer\\NameSpace\\{0DB7E03F-FC29-4DC6-9020-FF41B59E513A}" /f',
                'reg add "HKLM\\SOFTWARE\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Explorer\\MyComputer\\NameSpace\\{0DB7E03F-FC29-4DC6-9020-FF41B59E513A}" /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'enable-verbose-status',
        title: 'Enable Verbose Status Messages',
        category: '🔵 UI Customization',
        description: 'Shows detailed information during startup, shutdown, logon, and logoff for troubleshooting.',
        safety: 'safe',
        batchCheck: {
            type: 'registry',
            path: 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System',
            name: 'VerboseStatus',
            expectedValue: 'VerboseStatus    REG_DWORD    0x1'
        },
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v "VerboseStatus"');
            return result.stdout.includes('VerboseStatus    REG_DWORD    0x1');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v "VerboseStatus" /t REG_DWORD /d 1 /f');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v "VerboseStatus" /f');
        }
    },
    {
        id: 'disable-suggested-actions',
        title: 'Disable Suggested Actions',
        category: '🔵 UI Customization',
        description: 'Disables suggested actions when copying phone numbers, dates, etc. for cleaner experience.',
        safety: 'safe',
        batchCheck: {
            type: 'registry',
            path: 'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\SmartActionPlatform\\SmartClipboard',
            name: 'Disabled',
            expectedValue: 'Disabled    REG_DWORD    0x1'
        },
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\SmartActionPlatform\\SmartClipboard" /v "Disabled"');
            return result.stdout.includes('Disabled    REG_DWORD    0x1');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\SmartActionPlatform\\SmartClipboard" /v "Disabled" /t REG_DWORD /d 1 /f');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('reg delete "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\SmartActionPlatform\\SmartClipboard" /v "Disabled" /f');
        }
    },
    {
        id: 'disable-taskbar-chat',
        title: 'Disable Taskbar Chat (Teams)',
        category: '🔵 UI Customization',
        description: 'Removes the Chat/Teams icon from the Windows 11 taskbar.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "TaskbarMn"');
            return result.stdout.includes('TaskbarMn    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "TaskbarMn" /t REG_DWORD /d 0 /f');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "TaskbarMn" /t REG_DWORD /d 1 /f');
        }
    },
    {
        id: 'disable-taskbar-task-view',
        title: 'Disable Task View Button',
        category: '🔵 UI Customization',
        description: 'Removes the Task View button from the taskbar.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "ShowTaskViewButton"');
            return result.stdout.includes('ShowTaskViewButton    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "ShowTaskViewButton" /t REG_DWORD /d 0 /f');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "ShowTaskViewButton" /t REG_DWORD /d 1 /f');
        }
    },
    {
        id: 'show-seconds-in-clock',
        title: 'Show Seconds in Taskbar Clock',
        category: '🔵 UI Customization',
        description: 'Displays seconds in the taskbar clock.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "ShowSecondsInSystemClock"');
            return result.stdout.includes('ShowSecondsInSystemClock    REG_DWORD    0x1');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "ShowSecondsInSystemClock" /t REG_DWORD /d 1 /f');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('reg delete "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "ShowSecondsInSystemClock" /f');
        }
    },
    {
        id: 'disable-news-and-interests',
        title: 'Disable News and Interests',
        category: '🔵 UI Customization',
        description: 'Removes News and Interests from the Windows 10 taskbar.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Feeds" /v "ShellFeedsTaskbarViewMode"');
            return result.stdout.includes('ShellFeedsTaskbarViewMode    REG_DWORD    0x2');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Feeds" /v "ShellFeedsTaskbarViewMode" /t REG_DWORD /d 2 /f');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Feeds" /v "ShellFeedsTaskbarViewMode" /t REG_DWORD /d 1 /f');
        }
    },
    {
        id: 'disable-transparency-effects',
        title: 'Disable Transparency Effects',
        category: '🔵 UI Customization',
        description: 'Disables transparency effects in Windows for better performance.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v "EnableTransparency"');
            return result.stdout.includes('EnableTransparency    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v "EnableTransparency" /t REG_DWORD /d 0 /f');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v "EnableTransparency" /t REG_DWORD /d 1 /f');
        }
    },
    {
        id: 'show-protected-os-files',
        title: 'Show Protected Operating System Files',
        category: '🔵 UI Customization',
        description: 'Shows protected operating system files in File Explorer. Use with caution.',
        safety: 'caution',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "ShowSuperHidden"');
            return result.stdout.includes('ShowSuperHidden    REG_DWORD    0x1');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "ShowSuperHidden" /t REG_DWORD /d 1 /f');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "ShowSuperHidden" /t REG_DWORD /d 0 /f');
        }
    },
    {
        id: 'disable-animations',
        title: 'Disable Windows Animations',
        category: '🔵 UI Customization',
        description: 'Disables Windows animations for better performance on slower systems.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKEY_CURRENT_USER\\Control Panel\\Desktop\\WindowMetrics" /v "MinAnimate"');
            return result.stdout.includes('MinAnimate    REG_SZ    0');
        },
        apply: async () => {
            const commands = [
                'reg add "HKEY_CURRENT_USER\\Control Panel\\Desktop\\WindowMetrics" /v "MinAnimate" /t REG_SZ /d "0" /f',
                'reg add "HKEY_CURRENT_USER\\Control Panel\\Desktop" /v "UserPreferencesMask" /t REG_BINARY /d "9012038010000000" /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg add "HKEY_CURRENT_USER\\Control Panel\\Desktop\\WindowMetrics" /v "MinAnimate" /t REG_SZ /d "1" /f',
                'reg add "HKEY_CURRENT_USER\\Control Panel\\Desktop" /v "UserPreferencesMask" /t REG_BINARY /d "9E3E078012000000" /f'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'disable-balloon-tips',
        title: 'Disable Balloon Tips',
        category: '🔵 UI Customization',
        description: 'Disables balloon tip notifications in the system tray.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "EnableBalloonTips"');
            return result.stdout.includes('EnableBalloonTips    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "EnableBalloonTips" /t REG_DWORD /d 0 /f');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "EnableBalloonTips" /t REG_DWORD /d 1 /f');
        }
    },

    // ===== ADVANCED TWEAKS (CAUTION REQUIRED) =====
    {
        id: 'remove-onedrive',
        title: 'Remove OneDrive',
        category: '🟡 Advanced Tweaks',
        description: '⚠️ CAUTION: Completely removes OneDrive from the system. Files will be moved to local folders.',
        safety: 'caution',
        check: async () => {
            const result = await window.electronAPI.runCommand('where onedrive');
            return result.stderr.includes('Could not find');
        },
        apply: async () => {
            const script = `
$OneDrivePath = "$env:userprofile\\OneDrive"
if (Test - Path $OneDrivePath) {
    Write - Host "Backing up OneDrive files..."
                        robocopy "$OneDrivePath" "$env:userprofile" / E / COPYALL / R: 1 / W: 1
}
taskkill.exe / F / IM "OneDrive.exe"
Start - Sleep 3
                    winget uninstall Microsoft.OneDrive
Remove - Item - Path "$env:userprofile\\OneDrive" - Recurse - Force - ErrorAction SilentlyContinue
                `;
            await window.electronAPI.runAdminCommand(`powershell - Command "${script}"`);
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('winget install -e --accept-source-agreements --accept-package-agreements --silent Microsoft.OneDrive');
        }
    },
    {
        id: 'disable-ipv6',
        title: 'Disable IPv6',
        category: '🟡 Advanced Tweaks',
        description: '⚠️ CAUTION: Completely disables IPv6. May cause network issues on some configurations.',
        safety: 'caution',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters" /v "DisabledComponents"');
            return result.stdout.includes('DisabledComponents    REG_DWORD    0xff');
        },
        apply: async () => {
            const commands = [
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters" /v "DisabledComponents" /t REG_DWORD /d 255 /f',
                'powershell -Command "Disable-NetAdapterBinding -Name \\"*\\" -ComponentID ms_tcpip6"'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters" /v "DisabledComponents" /t REG_DWORD /d 0 /f',
                'powershell -Command "Enable-NetAdapterBinding -Name \\"*\\" -ComponentID ms_tcpip6"'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'disable-background-apps',
        title: 'Disable Background Apps',
        category: '🟡 Advanced Tweaks',
        description: '⚠️ CAUTION: Disables all Microsoft Store apps from running in the background.',
        safety: 'caution',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications" /v "GlobalUserDisabled"');
            return result.stdout.includes('GlobalUserDisabled    REG_DWORD    0x1');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications" /v "GlobalUserDisabled" /t REG_DWORD /d 1 /f');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications" /v "GlobalUserDisabled" /t REG_DWORD /d 0 /f');
        }
    },
    {
        id: 'classic-right-click-menu',
        title: 'Classic Right-Click Menu',
        category: '🟡 Advanced Tweaks',
        description: 'Restores the classic Windows 10 right-click context menu in Windows 11.',
        safety: 'caution',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKCU\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32"');
            return !result.stderr.includes('ERROR');
        },
        apply: async () => {
            const commands = [
                'reg add "HKCU\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32" /f /ve',
                'taskkill /f /im explorer.exe',
                'start explorer.exe'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKCU\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}" /f',
                'taskkill /f /im explorer.exe',
                'start explorer.exe'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'disable-telemetry',
        title: 'Disable Telemetry (Enhanced)',
        category: '🟢 Essential Tweaks',
        description: 'Comprehensively disables Windows telemetry services, tasks, and data collection.',
        check: async () => {
            const regResult = await window.electronAPI.runCommand('reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v "AllowTelemetry"');
            const serviceResult = await window.electronAPI.runCommand('sc.exe query DiagTrack');
            return regResult.stdout.includes('AllowTelemetry    REG_DWORD    0x0') && !serviceResult.stdout.includes('STATE_RUNNING');
        },
        apply: async () => {
            const commands = [
                // Core telemetry settings
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v "AllowTelemetry" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v "DoNotShowFeedbackNotifications" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v "AllowCommercialDataPipeline" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v "AllowDeviceNameInTelemetry" /t REG_DWORD /d 0 /f',
                // Disable services
                'sc.exe config "DiagTrack" start=disabled',
                'sc.exe stop "DiagTrack"',
                'sc.exe config "dmwappushservice" start=disabled',
                'sc.exe stop "dmwappushservice"',
                // Disable scheduled tasks
                'schtasks /Change /TN "Microsoft\\Windows\\Customer Experience Improvement Program\\Consolidator" /Disable',
                'schtasks /Change /TN "Microsoft\\Windows\\Customer Experience Improvement Program\\UsbCeip" /Disable',
                'schtasks /Change /TN "Microsoft\\Windows\\Application Experience\\Microsoft Compatibility Appraiser" /Disable',
                'schtasks /Change /TN "Microsoft\\Windows\\Application Experience\\ProgramDataUpdater" /Disable'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v "AllowTelemetry" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v "DoNotShowFeedbackNotifications" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v "AllowCommercialDataPipeline" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v "AllowDeviceNameInTelemetry" /f',
                'sc.exe config "DiagTrack" start=auto',
                'sc.exe start "DiagTrack"',
                'sc.exe config "dmwappushservice" start=auto',
                'sc.exe start "dmwappushservice"',
                'schtasks /Change /TN "Microsoft\\Windows\\Customer Experience Improvement Program\\Consolidator" /Enable',
                'schtasks /Change /TN "Microsoft\\Windows\\Customer Experience Improvement Program\\UsbCeip" /Enable',
                'schtasks /Change /TN "Microsoft\\Windows\\Application Experience\\Microsoft Compatibility Appraiser" /Enable',
                'schtasks /Change /TN "Microsoft\\Windows\\Application Experience\\ProgramDataUpdater" /Enable'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },

    {
        id: 'disable-lock-screen',
        title: 'Disable Lock Screen',
        category: '🟡 Advanced Tweaks',
        description: '⚠️ CAUTION: Disables the lock screen, showing the login screen directly. May affect security.',
        safety: 'caution',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Personalization" /v "NoLockScreen"');
            return result.stdout.includes('NoLockScreen    REG_DWORD    0x1');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Personalization" /v "NoLockScreen" /t REG_DWORD /d 1 /f');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Personalization" /v "NoLockScreen" /f');
        }
    },
    {
        id: 'disable-auto-reboot-on-failure',
        title: 'Disable Automatic Restart on System Failure',
        category: '🟢 Essential Tweaks',
        description: 'Prevents Windows from automatically restarting after a Blue Screen, allowing you to read error messages.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKEY_LOCAL_MACHINE\\System\\CurrentControlSet\\Control\\CrashControl" /v "AutoReboot"');
            return result.stdout.includes('AutoReboot    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKEY_LOCAL_MACHINE\\System\\CurrentControlSet\\Control\\CrashControl" /v "AutoReboot" /t REG_DWORD /d 0 /f');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKEY_LOCAL_MACHINE\\System\\CurrentControlSet\\Control\\CrashControl" /v "AutoReboot" /t REG_DWORD /d 1 /f');
        }
    },


    {
        id: 'disable-storage-sense',
        title: 'Disable Storage Sense',
        category: '🟡 Advanced Tweaks',
        description: '⚠️ CAUTION: Disables Storage Sense automatic disk cleanup. You\'ll need to manage disk space manually.',
        safety: 'caution',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\StorageSense" /v "AllowStorageSense"');
            return result.stdout.includes('AllowStorageSense    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\StorageSense" /v "AllowStorageSense" /t REG_DWORD /d 0 /f');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\StorageSense" /v "AllowStorageSense" /f');
        }
    },

    {
        id: 'disable-copilot',
        title: 'Disable Windows Copilot',
        category: '🟢 Essential Tweaks',
        description: 'Disables the Windows Copilot AI assistant feature for enhanced privacy.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot" /v "TurnOffWindowsCopilot"');
            return result.stdout.includes('TurnOffWindowsCopilot    REG_DWORD    0x1');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot" /v "TurnOffWindowsCopilot" /t REG_DWORD /d 1 /f');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot" /v "TurnOffWindowsCopilot" /f');
        }
    },
    {
        id: 'disable-recall',
        title: 'Disable Windows Recall',
        category: '🟢 Essential Tweaks',
        description: 'Disables Windows Recall feature that takes screenshots for AI analysis - major privacy concern.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI" /v "DisableAIDataAnalysis"');
            return result.stdout.includes('DisableAIDataAnalysis    REG_DWORD    0x1');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI" /v "DisableAIDataAnalysis" /t REG_DWORD /d 1 /f');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI" /v "DisableAIDataAnalysis" /f');
        }
    },
    {
        id: 'disable-enhanced-phishing-protection',
        title: 'Disable Enhanced Phishing Protection',
        category: '🟢 Essential Tweaks',
        description: 'Disables Enhanced Phishing Protection that monitors password usage for privacy.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WTDS\\Components" /v "ServiceEnabled"');
            return result.stdout.includes('ServiceEnabled    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WTDS\\Components" /v "ServiceEnabled" /t REG_DWORD /d 0 /f');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WTDS\\Components" /v "ServiceEnabled" /f');
        }
    },
    {
        id: 'disable-voice-activation',
        title: 'Disable Voice Activation',
        category: '🟢 Essential Tweaks',
        description: 'Disables voice activation for apps while the system is locked for enhanced security.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppPrivacy" /v "LetAppsActivateWithVoiceAboveLock"');
            return result.stdout.includes('LetAppsActivateWithVoiceAboveLock    REG_DWORD    0x2');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppPrivacy" /v "LetAppsActivateWithVoiceAboveLock" /t REG_DWORD /d 2 /f');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppPrivacy" /v "LetAppsActivateWithVoiceAboveLock" /f');
        }
    },
    {
        id: 'disable-windows-media-player-sharing',
        title: 'Disable Windows Media Player Network Sharing',
        category: '🔧 Useless Services',
        description: 'Disables Windows Media Player Network Sharing Service. Unnecessary if you don\'t share media.',
        safety: 'safe',
        check: async () => {
            const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"WMPNetworkSvc\\" -ErrorAction SilentlyContinue).StartType"';
            const result = await window.electronAPI.runCommand(command);
            return result.stdout.trim() === 'Disabled';
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('powershell -Command "Set-Service -Name \\"WMPNetworkSvc\\" -StartupType Disabled -ErrorAction SilentlyContinue"');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('powershell -Command "Set-Service -Name \\"WMPNetworkSvc\\" -StartupType Manual -ErrorAction SilentlyContinue"');
        }
    },
    {
        id: 'disable-telephony-service',
        title: 'Disable Telephony Service',
        category: '🔧 Useless Services',
        description: 'Disables Telephony API support. Unnecessary for most desktop users.',
        safety: 'safe',
        check: async () => {
            const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"TapiSrv\\" -ErrorAction SilentlyContinue).StartType"';
            const result = await window.electronAPI.runCommand(command);
            return result.stdout.trim() === 'Disabled';
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('powershell -Command "Set-Service -Name \\"TapiSrv\\" -StartupType Disabled -ErrorAction SilentlyContinue"');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('powershell -Command "Set-Service -Name \\"TapiSrv\\" -StartupType Manual -ErrorAction SilentlyContinue"');
        }
    },
    {
        id: 'disable-smart-card-service',
        title: 'Disable Smart Card Services',
        category: '🔧 Useless Services',
        description: 'Disables Smart Card services. Unnecessary if you don\'t use smart cards.',
        safety: 'safe',
        check: async () => {
            const services = ['SCardSvr', 'ScDeviceEnum'];
            for (const service of services) {
                const command = `powershell -NoProfile -Command "(Get-Service -Name \\"${service}\\" -ErrorAction SilentlyContinue).StartType"`;
                const result = await window.electronAPI.runCommand(command);
                if (result.stdout.trim() !== 'Disabled') {
                    return false;
                }
            }
            return true;
        },
        apply: async () => {
            const services = ['SCardSvr', 'ScDeviceEnum'];
            for (const service of services) {
                await window.electronAPI.runAdminCommand(`powershell -Command "Set-Service -Name \\"${service}\\" -StartupType Disabled -ErrorAction SilentlyContinue"`);
            }
        },
        revert: async () => {
            const services = ['SCardSvr', 'ScDeviceEnum'];
            for (const service of services) {
                await window.electronAPI.runAdminCommand(`powershell -Command "Set-Service -Name \\"${service}\\" -StartupType Manual -ErrorAction SilentlyContinue"`);
            }
        }
    },
    {
        id: 'disable-sensor-services',
        title: 'Disable Sensor Services',
        category: '🔧 Useless Services',
        description: 'Disables sensor monitoring services. Unnecessary for most desktop computers.',
        safety: 'safe',
        check: async () => {
            const services = ['SensrSvc', 'SensorService'];
            for (const service of services) {
                const command = `powershell - NoProfile - Command "(Get-Service -Name \\"${service} \\" -ErrorAction SilentlyContinue).StartType"`;
                const result = await window.electronAPI.runCommand(command);
                if (result.stdout.trim() !== 'Disabled') {
                    return false;
                }
            }
            return true;
        },
        apply: async () => {
            const services = ['SensrSvc', 'SensorService'];
            for (const service of services) {
                await window.electronAPI.runAdminCommand(`powershell - Command "Set-Service -Name \\"${service} \\" -StartupType Disabled -ErrorAction SilentlyContinue"`);
            }
        },
        revert: async () => {
            const services = ['SensrSvc', 'SensorService'];
            for (const service of services) {
                await window.electronAPI.runAdminCommand(`powershell - Command "Set-Service -Name \\"${service} \\" -StartupType Manual -ErrorAction SilentlyContinue"`);
            }
        }
    },
    {
        id: 'disable-mobile-hotspot-service',
        title: 'Disable Mobile Hotspot Service',
        category: '🔧 Useless Services',
        description: 'Disables Internet Connection Sharing service. Unnecessary if you don\'t share internet.',
        safety: 'safe',
        check: async () => {
            const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"SharedAccess\\" -ErrorAction SilentlyContinue).StartType"';
            const result = await window.electronAPI.runCommand(command);
            return result.stdout.trim() === 'Disabled';
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('powershell -Command "Set-Service -Name \\"SharedAccess\\" -StartupType Disabled -ErrorAction SilentlyContinue"');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('powershell -Command "Set-Service -Name \\"SharedAccess\\" -StartupType Manual -ErrorAction SilentlyContinue"');
        }
    },
    {
        id: 'disable-windows-time-service',
        title: 'Disable Windows Time Service',
        category: '🔧 Useless Services',
        description: '⚠️ CAUTION: Disables automatic time synchronization. Your clock may drift over time.',
        safety: 'caution',
        check: async () => {
            const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"W32Time\\" -ErrorAction SilentlyContinue).StartType"';
            const result = await window.electronAPI.runCommand(command);
            return result.stdout.trim() === 'Disabled';
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('powershell -Command "Set-Service -Name \\"W32Time\\" -StartupType Disabled -ErrorAction SilentlyContinue"');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('powershell -Command "Set-Service -Name \\"W32Time\\" -StartupType Manual -ErrorAction SilentlyContinue"');
        }
    },

    // ===== USELESS SERVICES =====
    {
        id: 'disable-sysmain',
        title: 'Disable SysMain (Superfetch)',
        category: '🔧 Useless Services',
        description: 'Disables the SysMain service, which preloads frequently used apps. Disabling may improve performance on SSDs.',
        safety: 'safe',
        check: async () => {
            const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"SysMain\\" -ErrorAction SilentlyContinue).StartType"';
            const result = await window.electronAPI.runCommand(command);
            return result.stdout.trim() === 'Disabled';
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('sc.exe stop "SysMain" && sc.exe config "SysMain" start=disabled');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('sc.exe config "SysMain" start=auto && sc.exe start "SysMain"');
        }
    },
    {
        id: 'disable-print-spooler',
        title: 'Disable Print Spooler',
        category: '🔧 Useless Services',
        safety: 'caution',
        description: 'Disables the Print Spooler service. If you don\'t use a printer, this can free up resources.',
        check: async () => {
            const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"Spooler\\" -ErrorAction SilentlyContinue).StartType"';
            const result = await window.electronAPI.runCommand(command);
            return result.stdout.trim() === 'Disabled';
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('sc.exe stop "Spooler" && sc.exe config "Spooler" start=disabled');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('sc.exe config "Spooler" start=auto && sc.exe start "Spooler"');
        }
    },
    {
        id: 'disable-fax-service',
        title: 'Disable Fax Service',
        category: '🔧 Useless Services',
        description: 'Disables the Fax service. Most users do not need this service. (Note: Service may not exist in Windows 11 24H2)',
        safety: 'safe',
        check: async () => {
            const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"Fax\\" -ErrorAction SilentlyContinue).StartType"';
            const result = await window.electronAPI.runCommand(command);
            // If service doesn't exist, stdout is empty. We consider this 'disabled'.
            return result.stdout.trim() === 'Disabled' || result.stdout.trim() === '';
        },
        apply: async () => {
            // Check if service exists before trying to disable it
            const commands = [
                'powershell -NoProfile -Command "if (Get-Service -Name \\"Fax\\" -ErrorAction SilentlyContinue) { Stop-Service -Name \\"Fax\\" -Force -ErrorAction SilentlyContinue; Set-Service -Name \\"Fax\\" -StartupType Disabled }"'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'powershell -NoProfile -Command "if (Get-Service -Name \\"Fax\\" -ErrorAction SilentlyContinue) { Set-Service -Name \\"Fax\\" -StartupType Automatic; Start-Service -Name \\"Fax\\" -ErrorAction SilentlyContinue }"'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'disable-windows-search',
        title: 'Disable Windows Search',
        category: '🔧 Useless Services',
        description: '⚠️ CAUTION: Disables the Windows Search service, which indexes files for faster searching. You\'ll lose file search functionality.',
        safety: 'caution',
        check: async () => {
            const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"WSearch\\" -ErrorAction SilentlyContinue).StartType"';
            const result = await window.electronAPI.runCommand(command);
            return result.stdout.trim() === 'Disabled';
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('sc.exe stop "WSearch" && sc.exe config "WSearch" start=disabled');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('sc.exe config "WSearch" start=auto && sc.exe start "WSearch"');
        }
    },
    {
        id: 'disable-windows-insider-service',
        title: 'Disable Windows Insider Service',
        category: '🔧 Useless Services',
        safety: 'safe',
        description: 'Disables the Windows Insider Service. If you are not part of the Windows Insider Program, this service is not needed.',
        check: async () => {
            const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"wisvc\\" -ErrorAction SilentlyContinue).StartType"';
            const result = await window.electronAPI.runCommand(command);
            return result.stdout.trim() === 'Disabled' || result.stdout.trim() === '';
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('sc.exe stop "wisvc" && sc.exe config "wisvc" start=disabled');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('sc.exe config "wisvc" start=auto && sc.exe start "wisvc"');
        }
    },
    {
        id: 'disable-remote-registry',
        title: 'Disable Remote Registry',
        category: '🔧 Useless Services',
        description: 'Disables the ability for remote users to modify registry settings. Recommended to keep disabled for security.',
        safety: 'safe',
        check: async () => {
            const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"RemoteRegistry\\" -ErrorAction SilentlyContinue).StartType"';
            const result = await window.electronAPI.runCommand(command);
            return result.stdout.trim() === 'Disabled';
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('sc.exe stop "RemoteRegistry" && sc.exe config "RemoteRegistry" start=disabled');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('sc.exe config "RemoteRegistry" start=auto && sc.exe start "RemoteRegistry"');
        }
    },
    {
        id: 'disable-alljoyn-router',
        title: 'Disable AllJoyn Router Service',
        category: '🔧 Useless Services',
        description: 'Disables the service for communicating with nearby Internet of Things (IoT) devices. Most users do not need this.',
        safety: 'safe',
        check: async () => {
            const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"AJRouter\\" -ErrorAction SilentlyContinue).StartType"';
            const result = await window.electronAPI.runCommand(command);
            return result.stdout.trim() === 'Disabled' || result.stdout.trim() === '';
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('sc.exe stop "AJRouter" && sc.exe config "AJRouter" start=disabled');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('sc.exe config "AJRouter" start=demand && sc.exe start "AJRouter"');
        }
    },
    {
        id: 'disable-program-compatibility-assistant',
        title: 'Disable Program Compatibility Assistant',
        category: '🔧 Useless Services',
        description: 'Disables the service that monitors for program compatibility issues. Can be turned off if not needed.',
        safety: 'safe',
        check: async () => {
            const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"PcaSvc\\" -ErrorAction SilentlyContinue).StartType"';
            const result = await window.electronAPI.runCommand(command);
            return result.stdout.trim() === 'Disabled';
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('sc.exe stop "PcaSvc" && sc.exe config "PcaSvc" start=disabled');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('sc.exe config "PcaSvc" start=auto && sc.exe start "PcaSvc"');
        }
    },
    {
        id: 'disable-ip-helper',
        title: 'Disable IP Helper',
        category: '🔧 Useless Services',
        description: '⚠️ CAUTION: Disables IPv6 connectivity over an IPv4 network. May impact some network features.',
        safety: 'caution',
        check: async () => {
            const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"iphlpsvc\\" -ErrorAction SilentlyContinue).StartType"';
            const result = await window.electronAPI.runCommand(command);
            return result.stdout.trim() === 'Disabled';
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('sc.exe stop "iphlpsvc" && sc.exe config "iphlpsvc" start=disabled');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('sc.exe config "iphlpsvc" start=auto && sc.exe start "iphlpsvc"');
        }
    },
    {
        id: 'disable-security-center',
        title: 'Disable Security Center',
        category: '🔧 Useless Services',
        description: 'Disables Windows Security Center notifications. This will NOT disable your antivirus or firewall.',
        safety: 'safe',
        check: async () => {
            const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"wscsvc\\" -ErrorAction SilentlyContinue).StartType"';
            const result = await window.electronAPI.runCommand(command);
            return result.stdout.trim() === 'Disabled';
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('sc.exe stop "wscsvc" && sc.exe config "wscsvc" start=disabled');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('sc.exe config "wscsvc" start=auto && sc.exe start "wscsvc"');
        }
    },
    {
        id: 'disable-remote-desktop',
        title: 'Disable Remote Desktop Service',
        category: '🔧 Useless Services',
        description: '⚠️ CAUTION: Disables Remote Desktop. Only disable if you never use Remote Desktop connections.',
        safety: 'caution',
        check: async () => {
            const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"TermService\\" -ErrorAction SilentlyContinue).StartType"';
            const result = await window.electronAPI.runCommand(command);
            return result.stdout.trim() === 'Disabled';
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('sc.exe stop "TermService" && sc.exe config "TermService" start=disabled');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('sc.exe config "TermService" start=demand && sc.exe start "TermService"');
        }
    },
    {
        id: 'disable-remote-access',
        title: 'Disable Routing and Remote Access',
        category: '🔧 Useless Services',
        description: '⚠️ CAUTION: Disables Remote Access service. Only disable if you don\'t use VPN/dial-up connections.',
        safety: 'caution',
        check: async () => {
            const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"RemoteAccess\\" -ErrorAction SilentlyContinue).StartType"';
            const result = await window.electronAPI.runCommand(command);
            return result.stdout.trim() === 'Disabled' || result.stdout.trim() === '';
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('sc.exe stop "RemoteAccess" && sc.exe config "RemoteAccess" start=disabled');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('sc.exe config "RemoteAccess" start=demand && sc.exe start "RemoteAccess"');
        }
    },
    {
        id: 'disable-winrm',
        title: 'Disable Windows Remote Management',
        category: '🔧 Useless Services',
        description: '⚠️ CAUTION: Disables Windows Remote Management. Only disable if you don\'t manage this PC remotely.',
        safety: 'caution',
        check: async () => {
            const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"WinRM\\" -ErrorAction SilentlyContinue).StartType"';
            const result = await window.electronAPI.runCommand(command);
            return result.stdout.trim() === 'Disabled';
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('sc.exe stop "WinRM" && sc.exe config "WinRM" start=disabled');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('sc.exe config "WinRM" start=auto && sc.exe start "WinRM"');
        }
    },
    {
        id: 'disable-link-tracking',
        title: 'Disable Distributed Link Tracking',
        category: '🔧 Useless Services',
        description: 'Disables tracking of linked files across NTFS volumes. Rarely needed on a single-user PC.',
        safety: 'safe',
        check: async () => {
            const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"TrkWks\\" -ErrorAction SilentlyContinue).StartType"';
            const result = await window.electronAPI.runCommand(command);
            return result.stdout.trim() === 'Disabled';
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('sc.exe stop "TrkWks" && sc.exe config "TrkWks" start=disabled');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('sc.exe config "TrkWks" start=auto && sc.exe start "TrkWks"');
        }
    },
    {
        id: 'disable-netlogon',
        title: 'Disable Netlogon Service',
        category: '🔧 Useless Services',
        description: '⚠️ CAUTION: Disables Netlogon service. Only disable if computer is not part of a domain.',
        safety: 'caution',
        check: async () => {
            const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"Netlogon\\" -ErrorAction SilentlyContinue).StartType"';
            const result = await window.electronAPI.runCommand(command);
            return result.stdout.trim() === 'Disabled' || result.stdout.trim() === '';
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('sc.exe stop "Netlogon" && sc.exe config "Netlogon" start=disabled');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('sc.exe config "Netlogon" start=demand && sc.exe start "Netlogon"');
        }
    },
    {
        id: 'disable-secondary-logon',
        title: 'Disable Secondary Logon',
        category: '🔧 Useless Services',
        description: 'Disables the Secondary Logon service (Run As). Can be disabled for security if not needed.',
        safety: 'safe',
        check: async () => {
            const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"seclogon\\" -ErrorAction SilentlyContinue).StartType"';
            const result = await window.electronAPI.runCommand(command);
            return result.stdout.trim() === 'Disabled';
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('sc.exe stop "seclogon" && sc.exe config "seclogon" start=disabled');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('sc.exe config "seclogon" start=auto && sc.exe start "seclogon"');
        }
    },
    {
        id: 'disable-tablet-input',
        title: 'Disable Touch Keyboard and Handwriting',
        category: '🔧 Useless Services',
        description: 'Disables touch keyboard and handwriting panel service. Unnecessary for most desktop users.',
        safety: 'safe',
        check: async () => {
            const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"TabletInputService\\" -ErrorAction SilentlyContinue).StartType"';
            const result = await window.electronAPI.runCommand(command);
            return result.stdout.trim() === 'Disabled' || result.stdout.trim() === '';
        },
        apply: async () => {
            const commands = [
                'powershell -NoProfile -Command "if (Get-Service -Name \\"TabletInputService\\" -ErrorAction SilentlyContinue) { Stop-Service -Name \\"TabletInputService\\" -Force -ErrorAction SilentlyContinue; Set-Service -Name \\"TabletInputService\\" -StartupType Disabled }"'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'powershell -NoProfile -Command "if (Get-Service -Name \\"TabletInputService\\" -ErrorAction SilentlyContinue) { Set-Service -Name \\"TabletInputService\\" -StartupType Automatic; Start-Service -Name \\"TabletInputService\\" -ErrorAction SilentlyContinue }"'
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'disable-waas-medic',
        title: 'Disable Windows Update Medic Service',
        category: '🔧 Useless Services',
        description: '⚠️ CAUTION: Disables Windows Update Medic Service. May affect Windows Update repair functionality.',
        safety: 'caution',
        check: async () => {
            const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"WaaSMedicSvc\\" -ErrorAction SilentlyContinue).StartType"';
            const result = await window.electronAPI.runCommand(command);
            return result.stdout.trim() === 'Disabled' || result.stdout.trim() === '';
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('sc.exe stop "WaaSMedicSvc" && sc.exe config "WaaSMedicSvc" start=disabled');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('sc.exe config "WaaSMedicSvc" start=demand && sc.exe start "WaaSMedicSvc"');
        }
    },
    {
        id: 'disable-gaming-services',
        title: 'Disable Xbox Gaming Services',
        category: '🔧 Useless Services',
        description: 'Disables all Xbox-related services. Recommended if you do not use the Xbox app or Game Bar.',
        safety: 'safe',
        check: async () => {
            const services = ['XblAuthManager', 'XblGameSave', 'XboxNetApiSvc', 'XboxGipSvc'];
            for (const service of services) {
                const command = `powershell - NoProfile - Command "(Get-Service -Name \\"${service} \\" -ErrorAction SilentlyContinue).StartType"`;
                const result = await window.electronAPI.runCommand(command);
                if (result.stdout.trim() !== 'Disabled' && result.stdout.trim() !== '') {
                    return false;
                }
            }
            return true;
        },
        apply: async () => {
            const commands = [
                'sc.exe stop "XblAuthManager" && sc.exe config "XblAuthManager" start=disabled',
                'sc.exe stop "XblGameSave" && sc.exe config "XblGameSave" start=disabled',
                'sc.exe stop "XboxNetApiSvc" && sc.exe config "XboxNetApiSvc" start=disabled',
                'sc.exe stop "XboxGipSvc" && sc.exe config "XboxGipSvc" start=disabled'
            ].join(' && ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'sc.exe config "XblAuthManager" start=demand && sc.exe start "XblAuthManager"',
                'sc.exe config "XblGameSave" start=demand && sc.exe start "XblGameSave"',
                'sc.exe config "XboxNetApiSvc" start=demand && sc.exe start "XboxNetApiSvc"',
                'sc.exe config "XboxGipSvc" start=demand && sc.exe start "XboxGipSvc"'
            ].join(' && ');
            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'disable-biometric-service',
        title: 'Disable Windows Biometric Service',
        category: '🔧 Useless Services',
        description: 'Disables biometric services (fingerprint, facial recognition). Disable if you do not use these features.',
        safety: 'safe',
        check: async () => {
            const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"WbioSrvc\\" -ErrorAction SilentlyContinue).StartType"';
            const result = await window.electronAPI.runCommand(command);
            return result.stdout.trim() === 'Disabled' || result.stdout.trim() === '';
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('sc.exe stop "WbioSrvc" && sc.exe config "WbioSrvc" start=disabled');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('sc.exe config "WbioSrvc" start=demand && sc.exe start "WbioSrvc"');
        }
    },
    {
        id: 'disable-geolocation-service',
        title: 'Disable Geolocation Service',
        category: '🔧 Useless Services',
        description: 'Disables the lfsvc for location tracking. Disable for privacy if not needed by any applications.',
        safety: 'safe',
        check: async () => {
            const command = 'powershell -NoProfile -Command "(Get-Service -Name \\"lfsvc\\" -ErrorAction SilentlyContinue).StartType"';
            const result = await window.electronAPI.runCommand(command);
            return result.stdout.trim() === 'Disabled' || result.stdout.trim() === '';
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('sc.exe stop "lfsvc" && sc.exe config "lfsvc" start=disabled');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('sc.exe config "lfsvc" start=demand && sc.exe start "lfsvc"');
        }
    },

    // ===== SERVICE OPTIMIZATION =====
    {
        id: 'optimize-services-bulk',
        title: 'Optimize Windows Services (Bulk)',
        category: '🟢 Essential Tweaks',
        description: 'Sets many unnecessary Windows services to manual startup to improve boot time and performance.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('sc.exe query DiagTrack');
            return !result.stdout.includes('STATE_RUNNING');
        },
        apply: async () => {
            const services = [
                'DiagTrack', 'dmwappushservice', 'WerSvc', 'Spooler', 'Fax',
                'WSearch', 'TabletInputService', 'WMPNetworkSvc', 'WbioSrvc',
                'lfsvc', 'MapsBroker', 'RetailDemo', 'TrkWks', 'WpcMonSvc'
            ];

            const commands = services.map(service =>
                `sc.exe config "${service}" start = demand`
            ).join(' & ');

            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const services = [
                'DiagTrack:auto', 'dmwappushservice:auto', 'WerSvc:demand', 'Spooler:auto', 'Fax:demand',
                'WSearch:auto', 'TabletInputService:demand', 'WMPNetworkSvc:demand', 'WbioSrvc:demand',
                'lfsvc:demand', 'MapsBroker:auto', 'RetailDemo:demand', 'TrkWks:auto', 'WpcMonSvc:demand'
            ];

            const commands = services.map(service => {
                const [name, startType] = service.split(':');
                return `sc.exe config "${name}" start = ${startType} `;
            }).join(' & ');

            await window.electronAPI.runAdminCommand(commands);
        }
    },
    {
        id: 'create-restore-point',
        title: 'Create System Restore Point',
        category: '🟢 Essential Tweaks',
        description: 'Creates a system restore point before applying major changes.',
        safety: 'safe',
        check: async () => {
            // This is a one-time action, so we'll always show it as available
            return false;
        },
        apply: async () => {
            const script = `
Enable - ComputerRestore - Drive "C:\\"
Checkpoint - Computer - Description "WinTool System Modifications" - RestorePointType "MODIFY_SETTINGS"
Write - Host "System restore point created successfully"
                `;
            await window.electronAPI.runAdminCommand(`powershell - Command "${script}"`);
        },
        revert: async () => {
            // Cannot revert restore point creation
            console.log('Cannot revert restore point creation');
        }
    }

];

// Populate tweak display names mapping
tweaks.forEach(tweak => {
    tweakDisplayNames[tweak.id] = tweak.title;
});

// Track if tweaks have been initialized to prevent duplicate loading
let tweaksInitialized = false;

// Main initialization - check if tweaksGrid exists
if (tweaksGrid) {

    const renderTweaks = async (filteredTweaks) => {
        // Prevent duplicate initialization
        if (tweaksInitialized && !filteredTweaks) {
            console.log('🚫 Tweaks already initialized, skipping duplicate render');
            return;
        }

        console.log('🚀 Starting tweaks render...', filteredTweaks ? 'filtered' : 'full');
        const tweaksToRender = filteredTweaks || tweaks;

        // Show loading indicator
        showLoadingIndicator();

        tweaksGrid.innerHTML = '';

        const categories = [...new Set(tweaksToRender.map(t => t.category || 'System Tweaks'))];

        // Progressive rendering to prevent UI blocking
        await renderTweaksProgressively(categories, tweaksToRender);

        // Use requestAnimationFrame to ensure UI is rendered before starting checks
        requestAnimationFrame(async () => {
            try {
                // Now perform checking (batch where possible, individual otherwise)
                await performOptimizedTweakChecks(tweaksToRender);

                // Mark as initialized only after successful completion
                if (!filteredTweaks) {
                    tweaksInitialized = true;
                    console.log('Tweaks initialization completed');
                }
            } finally {
                hideLoadingIndicator();
            }
        });
    };

    // Progressive rendering function to prevent UI blocking
    const renderTweaksProgressively = async (categories, tweaksToRender) => {
        const CHUNK_SIZE = 10; // Render 10 cards at a time

        for (const category of categories) {
            // Render category header
            const categoryHeader = document.createElement('h3');
            categoryHeader.className = 'plugin-section-header';
            categoryHeader.textContent = category;
            tweaksGrid.appendChild(categoryHeader);

            const categoryTweaks = tweaksToRender.filter(t => (t.category || 'System Tweaks') === category);

            // Render tweaks in chunks
            for (let i = 0; i < categoryTweaks.length; i += CHUNK_SIZE) {
                const chunk = categoryTweaks.slice(i, i + CHUNK_SIZE);

                // Render chunk
                chunk.forEach(tweak => {
                    const card = createTweakCard(tweak);
                    tweaksGrid.appendChild(card);
                });

                // Yield control to browser after each chunk
                if (i + CHUNK_SIZE < categoryTweaks.length) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
        }
    };

    // Helper function to create a tweak card
    const createTweakCard = (tweak) => {
        const card = document.createElement('div');
        card.className = 'plugin-card';
        card.dataset.tweakId = tweak.id;

        // Add safety level attribute for styling
        if (tweak.safety) {
            card.dataset.safety = tweak.safety;
        }

        card.innerHTML = `
            <div class="plugin-card-header">
                <h4 class="plugin-title">${tweak.title}</h4>
                <div class="plugin-status">
                    <span class="status-indicator"></span>
                    <span class="status-text">Loading...</span>
                </div>
            </div>
            <p class="plugin-description">${tweak.description}</p>
            <div class="plugin-card-footer">
                <label class="toggle-switch">
                    <input type="checkbox" class="tweak-checkbox" disabled>
                    <span class="slider"></span>
                </label>
            </div>
        `;

        return card;
    };

    // Loading indicator functions
    const showLoadingIndicator = () => {
        let loadingIndicator = document.getElementById('tweaks-loading-indicator');
        if (!loadingIndicator) {
            loadingIndicator = document.createElement('div');
            loadingIndicator.id = 'tweaks-loading-indicator';
            loadingIndicator.className = 'loading-indicator';
            loadingIndicator.innerHTML = `
                <div class="loading-spinner"></div>
                <div class="loading-text">Loading tweak status...</div>
            `;
            tweaksGrid.parentNode.insertBefore(loadingIndicator, tweaksGrid);
        }
        loadingIndicator.style.display = 'flex';
    };

    const hideLoadingIndicator = () => {
        const loadingIndicator = document.getElementById('tweaks-loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    };

    // Function to perform optimized tweak status checks using batch operations
    const performOptimizedTweakChecks = async (tweaksToCheck) => {
        console.log('🔍 performOptimizedTweakChecks called with', tweaksToCheck.length, 'tweaks');
        console.log('🔍 Tweaks initialized status:', tweaksInitialized);

        // Use SimpleBatchChecker for optimized registry checks
        console.log('Using SimpleBatchChecker for optimized registry checks');
        await performBatchOptimizedChecks(tweaksToCheck);

        console.log('✅ All tweak checks completed');
    };

    // Optimized batch checking using SimpleBatchChecker utility
    const performBatchOptimizedChecks = async (tweaksToCheck) => {
        const batchChecker = new SimpleBatchChecker();
        const batchableTweaks = [];
        const individualTweaks = [];

        // Separate tweaks that can be batched vs those that need individual checks
        tweaksToCheck.forEach(tweak => {
            if (tweak.batchCheck && tweak.batchCheck.type === 'registry') {
                batchableTweaks.push(tweak);
                batchChecker.addRegistryCheck(
                    tweak.id,
                    tweak.batchCheck.path,
                    tweak.batchCheck.name,
                    tweak.batchCheck.expectedValue
                );
            } else {
                individualTweaks.push(tweak);
            }
        });

        console.log(`Batching ${batchableTweaks.length} registry checks, ${individualTweaks.length} individual checks`);

        // Execute batch checks first
        if (batchableTweaks.length > 0) {
            try {
                await batchChecker.executeRegistryChecks();

                // Update UI for batched tweaks
                batchableTweaks.forEach(tweak => {
                    const card = document.querySelector(`[data-tweak-id="${tweak.id}"]`);
                    if (!card) return;

                    const status = batchChecker.isRegistryCheckMatched(tweak.id);
                    updateTweakCardStatus(card, status);

                    // Cache the result
                    tweakStatusCache.set(tweak.id, status);
                });
            } catch (error) {
                console.error('Batch registry checks failed, falling back to individual checks:', error);
                // Fall back to individual checks for batched tweaks
                await performIndividualChecks(batchableTweaks);
            }
        }

        // Execute individual checks for remaining tweaks
        if (individualTweaks.length > 0) {
            await performIndividualChecks(individualTweaks);
        }
    };

    // Individual check fallback method with caching
    const performIndividualChecks = async (tweaksToCheck) => {
        const currentTime = Date.now();
        const isCacheValid = (currentTime - cacheTimestamp) < CACHE_DURATION;

        const checkPromises = tweaksToCheck.map(async (tweak) => {
            const card = document.querySelector(`[data-tweak-id="${tweak.id}"]`);
            if (!card) return;

            try {
                let status;

                // Check cache first
                if (isCacheValid && tweakStatusCache.has(tweak.id)) {
                    status = tweakStatusCache.get(tweak.id);
                } else {
                    // Perform actual check
                    status = await tweak.check();
                    // Cache the result
                    tweakStatusCache.set(tweak.id, status);
                }

                updateTweakCardStatus(card, status);
            } catch (error) {
                console.error(`Failed to check tweak status for ${tweak.title}`, error);
                const statusText = card.querySelector('.status-text');
                if (statusText) {
                    statusText.textContent = 'Error';
                }
                const checkbox = card.querySelector('.tweak-checkbox');
                if (checkbox) {
                    checkbox.disabled = false;
                }
            }
        });

        // Update cache timestamp if we performed new checks
        if (!isCacheValid) {
            cacheTimestamp = currentTime;
        }

        // Execute checks in smaller batches to prevent overwhelming the system
        const batchSize = 5; // Reduced batch size for individual checks
        for (let i = 0; i < checkPromises.length; i += batchSize) {
            const batch = checkPromises.slice(i, i + batchSize);
            await Promise.all(batch);

            // Smaller delay between batches
            if (i + batchSize < checkPromises.length) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
    };

    // Helper function to update tweak card status
    const updateTweakCardStatus = (card, status) => {
        const statusIndicator = card.querySelector('.status-indicator');
        const statusText = card.querySelector('.status-text');
        const checkbox = card.querySelector('.tweak-checkbox');

        statusIndicator.classList.toggle('active', status);
        statusText.textContent = status ? 'Active' : 'Inactive';
        checkbox.checked = status;
        checkbox.disabled = false;
    };

    // Helper function to clear cache for a specific tweak
    const clearTweakCache = (tweakId) => {
        tweakStatusCache.delete(tweakId);
    };

    // Helper function to clear all cache
    const clearAllCache = () => {
        tweakStatusCache.clear();
        cacheTimestamp = 0;
    };

    // Global function to reset tweaks initialization (for manual refresh)
    window.resetTweaksInitialization = () => {
        tweaksInitialized = false;
        clearAllCache();
        console.log('Tweaks initialization reset - next render will reload everything');
    };

    tweaksGrid.addEventListener('change', async (event) => {
        if (event.target.classList.contains('tweak-checkbox')) {
            const checkbox = event.target;
            const card = checkbox.closest('.plugin-card');
            const tweakId = card.dataset.tweakId;
            const tweak = tweaks.find(t => t.id === tweakId);
            const statusIndicator = card.querySelector('.status-indicator');
            const statusText = card.querySelector('.status-text');

            // Disable the checkbox to prevent rapid clicking
            checkbox.disabled = true;
            statusText.textContent = 'Applying...';

            try {
                if (checkbox.checked) {
                    await tweak.apply();
                    statusIndicator.classList.add('active');
                    statusText.textContent = 'Active';
                    // Update cache
                    tweakStatusCache.set(tweakId, true);
                } else {
                    await tweak.revert();
                    statusIndicator.classList.remove('active');
                    statusText.textContent = 'Inactive';
                    // Update cache
                    tweakStatusCache.set(tweakId, false);
                }
            } catch (error) {
                console.error(`Failed to apply / revert tweak: ${tweak.title} `, error);
                statusText.textContent = 'Error';
                // Revert the checkbox to its previous state on failure
                checkbox.checked = !checkbox.checked;
            } finally {
                // Re-enable the checkbox after the operation is complete
                checkbox.disabled = false;
            }
        }
    });

    const searchInput = document.getElementById('tweak-search');
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredTweaks = tweaks.filter(tweak =>
            tweak.title.toLowerCase().includes(searchTerm) ||
            tweak.description.toLowerCase().includes(searchTerm)
        );
        renderTweaks(filteredTweaks);
    });

    const exportTweaksBtn = document.getElementById('export-tweaks-btn');
    exportTweaksBtn.addEventListener('click', async () => {
        const appliedTweaks = [];
        // Query all tweak cards directly from the grid to ensure everything displayed is considered.
        const allTweakCards = tweaksGrid.querySelectorAll('.plugin-card');

        allTweakCards.forEach(card => {
            const checkbox = card.querySelector('.tweak-checkbox');
            if (checkbox && checkbox.checked) {
                const tweakId = card.dataset.tweakId;
                // Ensure the tweak exists in our master list before exporting
                if (tweaks.some(t => t.id === tweakId)) {
                    appliedTweaks.push(tweakId);
                }
            }
        });

        const exportData = {
            description: "WinTool Applied Tweaks Configuration",
            exportDate: new Date().toISOString(),
            tweakCount: appliedTweaks.length,
            appliedTweakIds: appliedTweaks
        };

        const content = JSON.stringify(exportData, null, 2);
        const result = await window.electronAPI.saveFile(content, {
            title: 'Export Applied Tweaks',
            defaultPath: 'wintool-tweaks.json',
            filters: [{ name: 'JSON Files', extensions: ['json'] }]
        });

        if (result && result.filePath) {
            // This is a placeholder for a notification. Assuming electronAPI has such a function.
            console.log(`${appliedTweaks.length} tweaks exported successfully to ${result.filePath} `);
        }
    });

    // Save Preset functionality
    const savePresetBtn = document.getElementById('save-preset-btn');
    if (savePresetBtn) {
        savePresetBtn.addEventListener('click', showSavePresetModal);
    }

    const importTweaksBtn = document.getElementById('import-tweaks-btn');
    importTweaksBtn.addEventListener('click', async () => {
        const result = await window.electronAPI.showOpenDialog({
            title: 'Import Applied Tweaks',
            properties: ['openFile'],
            filters: [{ name: 'JSON Files', extensions: ['json'] }]
        });

        if (result && !result.canceled && result.filePaths.length > 0) {
            const filePath = result.filePaths[0];
            try {
                const content = await window.electronAPI.readFile(filePath);
                const importedData = JSON.parse(content);

                // Support multiple formats: preset files, export files, and simple arrays
                let importedTweakIds;
                let importType = 'unknown';

                if (Array.isArray(importedData)) {
                    // Simple array format
                    importedTweakIds = importedData;
                    importType = 'simple array';
                } else if (importedData.tweaks && Array.isArray(importedData.tweaks)) {
                    // Preset format
                    importedTweakIds = importedData.tweaks;
                    importType = `preset "${importedData.name || 'Unknown'}"`;
                } else if (importedData.appliedTweakIds && Array.isArray(importedData.appliedTweakIds)) {
                    // Export format
                    importedTweakIds = importedData.appliedTweakIds;
                    importType = 'export file';
                } else {
                    console.error('Imported file does not contain a valid format.');
                    alert('Invalid file format. Please select a valid tweaks export file or preset file.');
                    return;
                }

                if (!Array.isArray(importedTweakIds)) {
                    console.error('Imported file does not contain a valid array of tweak IDs.');
                    alert('Invalid file format. Please select a valid tweaks export file or preset file.');
                    return;
                }

                // Show confirmation for presets
                if (importType.includes('preset')) {
                    const confirmMessage = `Import ${importType}?\n\nThis will apply ${importedTweakIds.length} tweaks from the preset.\n\nDo you want to continue?`;
                    if (!confirm(confirmMessage)) {
                        return;
                    }
                }

                let appliedCount = 0;
                for (const tweakId of importedTweakIds) {
                    const tweak = tweaks.find(t => t.id === tweakId);
                    if (tweak) {
                        const card = tweaksGrid.querySelector(`[data-tweak-id="${tweak.id}"]`);
                        if (card) {
                            const checkbox = card.querySelector('.tweak-checkbox');
                            // Apply if it's not already checked
                            if (!checkbox.checked) {
                                checkbox.checked = true;
                                // Dispatch change event to trigger the apply logic
                                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                                appliedCount++;

                                // Add a small delay for presets to prevent overwhelming the system
                                if (importType.includes('preset')) {
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                }
                            }
                        }
                    }
                }

                const message = `Successfully imported ${importType} !\n\n${appliedCount} tweaks were newly applied.`;
                console.log(message);
                alert(message);

            } catch (error) {
                console.error('Failed to read or parse imported tweaks file:', error);
            }
        }
    });

    // Performance monitoring
    const startTime = performance.now();
    console.log('Starting tweaks tab initialization...');
    console.log(`Total tweaks to load: ${tweaks.length} `);

    // Count batchable tweaks
    const batchableTweaks = tweaks.filter(tweak => tweak.batchCheck && tweak.batchCheck.type === 'registry');
    console.log(`Batchable tweaks: ${batchableTweaks.length}, Individual tweaks: ${tweaks.length - batchableTweaks.length} `);

    renderTweaks().then(() => {
        const endTime = performance.now();
        console.log(`Tweaks tab loaded in ${(endTime - startTime).toFixed(2)} ms`);
        console.log(`Cache entries: ${tweakStatusCache.size} `);
    });

    // Populate preset tooltips after DOM is ready
    setTimeout(() => {
        populatePresetTooltips();
    }, 100);

    // Notify tab loader that this tab is ready
    if (window.tabLoader) {
        window.tabLoader.markTabAsReady('tweaks');
    }
} else {
    console.error('Could not find the tweaks-grid element.');
    // Still mark as ready to not block app loading
    if (window.tabLoader) {
        window.tabLoader.markTabAsReady('tweaks');
    }
}

/**
 * Load a preset configuration - now shows detailed preview modal
 */
function loadTweakPreset(presetName) {
    const preset = tweakPresets[presetName];
    if (!preset) {
        console.error(`Preset "${presetName}" not found`);
        return;
    }

    showPresetPreviewModal(presetName, preset);
}

/**
 * Show the preset preview modal with detailed information
 */
function showPresetPreviewModal(presetName, preset) {
    const modal = document.getElementById('preset-preview-modal');
    const modalTitle = document.getElementById('preset-modal-title');
    const modalDescription = document.getElementById('preset-modal-description');
    const tweakCountSpan = document.getElementById('preset-tweak-count');
    const safetyLevelSpan = document.getElementById('preset-safety-level');
    const tweaksList = document.getElementById('preset-tweaks-list');
    const applyBtn = document.getElementById('apply-preset-btn');

    // Set modal content
    modalTitle.textContent = preset.name;
    modalDescription.textContent = preset.description;
    tweakCountSpan.textContent = `${preset.tweaks.length} tweaks`;

    // Calculate safety level
    const safetyInfo = calculatePresetSafety(preset.tweaks);
    safetyLevelSpan.innerHTML = `<i class="fas fa-shield-alt" style="color: ${safetyInfo.color}"></i> ${safetyInfo.level}`;

    // Clear and populate tweaks list
    tweaksList.innerHTML = '';

    preset.tweaks.forEach(tweakId => {
        const tweak = tweaks.find(t => t.id === tweakId);
        if (tweak) {
            const tweakItem = createPresetTweakItem(tweak);
            tweaksList.appendChild(tweakItem);
        }
    });

    // Set up apply button
    applyBtn.onclick = () => {
        closePresetModal();
        applyPresetWithConfirmation(presetName, preset);
    };

    // Show modal
    modal.classList.add('show');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

/**
 * Close the preset preview modal
 */
function closePresetModal() {
    const modal = document.getElementById('preset-preview-modal');
    modal.classList.remove('show');
    document.body.style.overflow = ''; // Restore scrolling
}

/**
 * Create a tweak item for the preset preview
 */
function createPresetTweakItem(tweak) {
    const item = document.createElement('div');
    item.className = `preset-tweak-item ${tweak.safety || 'safe'}`;

    item.innerHTML = `
        <div class="preset-tweak-category">${tweak.category || 'System Tweak'}</div>
        <div class="preset-tweak-title">${tweak.title}</div>
        <div class="preset-tweak-description">${tweak.description}</div>
    `;

    return item;
}

/**
 * Calculate the overall safety level of a preset
 */
function calculatePresetSafety(tweakIds) {
    let safeCount = 0;
    let cautionCount = 0;
    let dangerCount = 0;

    tweakIds.forEach(tweakId => {
        const tweak = tweaks.find(t => t.id === tweakId);
        if (tweak) {
            switch (tweak.safety) {
                case 'safe':
                    safeCount++;
                    break;
                case 'caution':
                    cautionCount++;
                    break;
                case 'danger':
                    dangerCount++;
                    break;
                default:
                    safeCount++; // Default to safe
            }
        }
    });

    if (dangerCount > 0) {
        return { level: `Extreme Risk (${dangerCount} dangerous tweaks)`, color: '#dc3545' };
    } else if (cautionCount > 2) {
        return { level: `High Risk (${cautionCount} caution tweaks)`, color: '#ffc107' };
    } else if (cautionCount > 0) {
        return { level: `Moderate Risk (${cautionCount} caution tweaks)`, color: '#fd7e14' };
    } else {
        return { level: `Safe (${safeCount} safe tweaks)`, color: '#28a745' };
    }
}

/**
 * Apply preset with confirmation after modal preview
 */
function applyPresetWithConfirmation(presetName, preset) {
    const safetyInfo = calculatePresetSafety(preset.tweaks);
    let confirmMessage = `Ready to apply "${preset.name}"?\n\n`;
    confirmMessage += `• ${preset.tweaks.length} tweaks will be applied\n`;
    confirmMessage += `• Safety Level: ${safetyInfo.level}\n\n`;

    if (safetyInfo.level.includes('Risk')) {
        confirmMessage += `⚠️ WARNING: This preset includes tweaks that may affect system stability.\n`;
        confirmMessage += `Make sure you have a system restore point before proceeding.\n\n`;
    }

    confirmMessage += `Continue with applying this preset?`;

    if (confirm(confirmMessage)) {
        // Find the preset card that was clicked
        const presetCard = document.getElementById(`preset-${presetName}`);

        // Add loading state to the preset card
        if (presetCard) {
            presetCard.classList.add('loading');
        }

        applyPresetTweaks(preset).finally(() => {
            // Remove loading state
            if (presetCard) {
                presetCard.classList.remove('loading');
            }
        });
    }
}

// Close modal when clicking outside of it
document.addEventListener('click', (event) => {
    const modal = document.getElementById('preset-preview-modal');
    if (event.target === modal) {
        closePresetModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        const modal = document.getElementById('preset-preview-modal');
        if (modal && modal.classList.contains('show')) {
            closePresetModal();
        }
    }
});

/**
 * Apply tweaks from a preset
 */
async function applyPresetTweaks(preset) {
    let appliedCount = 0;
    let skippedCount = 0;

    console.log(`Applying preset: ${preset.name} `);

    for (const tweakId of preset.tweaks) {
        const card = tweaksGrid.querySelector(`[data-tweak-id="${tweakId}"]`);
        if (card) {
            const checkbox = card.querySelector('.tweak-checkbox');
            if (checkbox && !checkbox.checked) {
                // Simulate clicking the checkbox to apply the tweak
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                appliedCount++;

                // Add a small delay to prevent overwhelming the system
                await new Promise(resolve => setTimeout(resolve, 100));
            } else if (checkbox && checkbox.checked) {
                skippedCount++;
            }
        } else {
            console.warn(`Tweak "${tweakId}" not found in current tweaks list`);
        }
    }

    console.log(`Preset "${preset.name}" applied: ${appliedCount} tweaks applied, ${skippedCount} already applied`);

    // Show completion message
    alert(`Preset "${preset.name}" applied successfully!\n\n${appliedCount} tweaks were applied\n${skippedCount} tweaks were already applied\n\nA system restart is recommended for all changes to take effect.`);
}

/**
 * Show save preset modal
 */
function showSavePresetModal() {
    // Get currently applied tweaks
    const appliedTweaks = [];
    const allTweakCards = tweaksGrid.querySelectorAll('.plugin-card');

    allTweakCards.forEach(card => {
        const checkbox = card.querySelector('.tweak-checkbox');
        if (checkbox && checkbox.checked) {
            appliedTweaks.push(card.dataset.tweakId);
        }
    });

    if (appliedTweaks.length === 0) {
        alert('No tweaks are currently applied. Apply some tweaks first before saving a preset.');
        return;
    }

    const presetName = prompt(`Enter a name for your custom preset: \n\n(${appliedTweaks.length} tweaks will be included)`);

    if (presetName && presetName.trim()) {
        saveCustomPreset(presetName.trim(), appliedTweaks);
    }
}

/**
 * Save a custom preset
 */
async function saveCustomPreset(name, tweakIds) {
    const customPreset = {
        name: name,
        description: `Custom preset with ${tweakIds.length} tweaks`,
        tweaks: tweakIds,
        created: new Date().toISOString(),
        type: 'custom'
    };

    const content = JSON.stringify(customPreset, null, 2);
    const result = await window.electronAPI.saveFile(content, {
        title: 'Save Custom Preset',
        defaultPath: `${name.replace(/[^a-zA-Z0-9]/g, '_')} -preset.json`,
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });

    if (result && result.filePath) {
        console.log(`Custom preset "${name}" saved successfully to ${result.filePath} `);
        alert(`Custom preset "${name}" saved successfully!\n\nYou can import this preset later using the Import button.`);
    }
}

/**
 * Populate preset tooltips with tweak names
 */
function populatePresetTooltips() {
    console.log('Populating preset tooltips...');

    Object.keys(tweakPresets).forEach(presetKey => {
        const preset = tweakPresets[presetKey];
        const listElement = document.getElementById(`${presetKey}-tweaks-list`);

        console.log(`Looking for element: ${presetKey}-tweaks-list`, listElement);

        if (listElement) {
            listElement.innerHTML = '';

            preset.tweaks.forEach(tweakId => {
                const tweakName = tweakDisplayNames[tweakId] || tweakId;
                const listItem = document.createElement('li');
                listItem.textContent = tweakName;
                listElement.appendChild(listItem);
            });

            console.log(`Populated ${preset.tweaks.length} tweaks for ${presetKey}`);
        } else {
            console.warn(`Could not find list element for ${presetKey}`);
        }
    });
}

// Make functions globally available
window.loadTweakPreset = loadTweakPreset;
window.showSavePresetModal = showSavePresetModal;
window.populatePresetTooltips = populatePresetTooltips;
window.closePresetModal = closePresetModal;
window.showPresetPreviewModal = showPresetPreviewModal;
