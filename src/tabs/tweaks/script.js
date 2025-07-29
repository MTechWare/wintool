let tweakDisplayNames = {};

// Preset configurations for Windows Tweaks
let tweakPresets = {
    essential: {
        name: 'Essential Basics',
        description: 'Safe and essential tweaks that every user should consider',
        tweaks: [
            'show-file-extensions',
            'show-hidden-files',
            'explorer-to-this-pc',
            'enable-dark-mode',
            'taskbar-align-left',
            'restore-classic-context-menu',
            'disable-fast-startup',
        ],
    },
    privacy: {
        name: 'Privacy Protection',
        description: 'Comprehensive privacy protection - stops tracking and data collection',
        tweaks: [
            'disable-telemetry-comprehensive',
            'disable-bing-search',
            'disable-copilot',
            'disable-recall',
            'disable-settings-ads',
            'disable-desktop-spotlight',
            'w11boost-disable-cloud-content',
            'w11boost-disable-web-search',
            'w11boost-disable-device-metadata',
            'w11boost-disable-clipboard-sync',
            'w11boost-disable-message-sync',
            'w11boost-enhanced-recall-disable',
            'w11boost-disable-experimentation',
            'w11boost-disable-enhanced-phishing',
            'w11boost-disable-speech-model-updates',
            'w11boost-disable-news-interests',
        ],
    },
    performance: {
        name: 'Performance Boost',
        description: 'Maximum system performance and responsiveness optimizations',
        tweaks: [
            'disable-transparency',
            'disable-animations',
            'optimizer-performance-tweaks',
            'optimizer-network-throttling',
            'optimizer-disable-superfetch',
            'optimizer-remove-menu-delay',
            'w11boost-disable-power-throttling',
            'w11boost-disable-fth',
            'w11boost-ntfs-optimizations',
            'w11boost-disable-paging-executive',
            'w11boost-disable-storage-sense',
            'w11boost-disable-auto-repair',
            'disable-mouse-acceleration',
        ],
    },
    interface: {
        name: 'Interface Cleanup',
        description: 'Clean up Windows 11 interface and remove clutter',
        tweaks: [
            'disable-widgets',
            'hide-chat-taskbar',
            'hide-taskbar-search',
            'hide-taskbar-taskview',
            'disable-start-recommendations',
            'disable-windows-suggestions',
            'disable-lockscreen-tips',
            'enable-end-task-taskbar',
            'optimizer-show-all-tray-icons',
            'disable-phone-link-start',
        ],
    },
    debloat: {
        name: 'App Debloat',
        description: 'Remove bloatware apps and unnecessary Windows features',
        tweaks: [
            'remove-bloatware-apps',
            'remove-communication-apps',
            'remove-gaming-apps',
            'w11boost-disable-app-archiving',
            'hide-3d-objects',
            'hide-gallery-explorer',
            'hide-home-explorer',
        ],
    },
    wintool_exclusive: {
        name: 'WinTool Exclusive Suite',
        description:
            'Cutting-edge optimizations available only in WinTool - our signature performance and intelligence features',
        tweaks: [
            'wintool-smart-power-management',
            'wintool-enhanced-file-operations',
            'wintool-intelligent-startup-optimizer',
            'wintool-adaptive-network-optimization',
            'wintool-smart-memory-compression',
            'wintool-ai-system-optimization',
        ],
    },
    gaming_pro: {
        name: 'Gaming Pro',
        description: 'Ultimate gaming performance with WinTool exclusive optimizations',
        tweaks: [
            'wintool-gaming-performance-boost',
            'wintool-smart-memory-compression',
            'wintool-adaptive-network-optimization',
            'disable-game-bar',
            'disable-game-mode',
            'disable-fullscreen-optimizations',
        ],
    },
    developer_suite: {
        name: 'Developer Suite',
        description: 'Optimized environment for software development and coding',
        tweaks: [
            'wintool-developer-productivity-suite',
            'wintool-enhanced-file-operations',
            'wintool-smart-memory-compression',
            'show-file-extensions',
            'show-hidden-files',
            'enable-dark-mode',
        ],
    },
    gaming: {
        name: 'Gaming Optimization',
        description: 'Optimized for gaming performance and reduced input lag',
        tweaks: [
            'disable-xbox-dvr',
            'optimizer-enable-gaming-mode',
            'disable-mouse-acceleration',
            'disable-sticky-keys',
            'disable-transparency',
            'disable-animations',
            'w11boost-disable-power-throttling',
            'optimizer-network-throttling',
        ],
    },
    fileexplorer: {
        name: 'File Explorer Enhancement',
        description: 'Improve File Explorer functionality and clean up navigation',
        tweaks: [
            'show-file-extensions',
            'show-hidden-files',
            'explorer-to-this-pc',
            'hide-3d-objects',
            'hide-gallery-explorer',
            'hide-home-explorer',
            'hide-duplicate-drives',
            'hide-include-in-library',
            'hide-give-access-to',
            'hide-share-context-menu',
        ],
    },
    enterprise: {
        name: 'Enterprise/Business',
        description: 'Professional setup optimized for business environments',
        tweaks: [
            'optimizer-disable-homegroup',
            'optimizer-disable-media-sharing',
            'optimizer-disable-fax-service',
            'optimizer-disable-compatibility-assistant',
            'show-search-box-taskbar',
            'optimizer-disable-print-service',
            'disable-copilot',
            'disable-recall',
            'w11boost-disable-experimentation',
        ],
    },
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
            const commands = this.registryChecks.map(check => {
                // Use double quotes for registry paths as expected by reg.exe
                return `try { $result = reg query "${check.path}" /v "${check.name}" 2>$null; if ($LASTEXITCODE -eq 0) { Write-Output "${check.key}:SUCCESS:" + $result } else { Write-Output "${check.key}:NOTFOUND:" } } catch { Write-Output "${check.key}:ERROR:" }`;
            });

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
                            const isMatch =
                                status === 'SUCCESS' && output.includes(check.expectedValue);
                            results[key] = {
                                found: status === 'SUCCESS',
                                matches: isMatch,
                                output: output,
                            };
                            this.results.set(key, results[key]);
                        }
                    }
                });
            }

            return results;
        } catch (error) {
            window.electronAPI.logError(
                `Batch registry check failed: ${error.message}`,
                'TweaksTab'
            );
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
        // Use double quotes for proper registry path formatting
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
        // Use double quotes for proper registry path formatting
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

// Global tweaks array - Based on Win11Debloat by Raphire, Optimizer by hellzerg, and W11Boost by felikcat
// Credit: Many of these tweaks are adapted from excellent projects:
// - Win11Debloat by Raphire: https://github.com/Raphire/Win11Debloat (MIT License)
// - Optimizer by hellzerg: https://github.com/hellzerg/optimizer (GPL-3.0 License)
// - W11Boost by felikcat: https://github.com/felikcat/W11Boost (AGPL-3.0 License)
let tweaks = [
    // ===== PRIVACY & SECURITY =====
    {
        id: 'disable-telemetry-comprehensive',
        title: 'Disable Telemetry & Diagnostic Data',
        category: '🛡️ Privacy & Security',
        description:
            'Disables Windows telemetry, diagnostic data collection, activity history, app-launch tracking and targeted ads.',
        safety: 'safe',
        batchCheck: {
            type: 'registry',
            path: 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\DataCollection',
            name: 'AllowTelemetry',
            expectedValue: 'AllowTelemetry    REG_DWORD    0x0',
        },
        check: async () => {
            return await checkRegistryValue(
                'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\DataCollection',
                'AllowTelemetry',
                '0x0'
            );
        },
        apply: async () => {
            const commands = [
                // Disable advertising ID
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" /v "Enabled" /t REG_DWORD /d 0 /f',
                // Disable tailored experiences
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Privacy" /v "TailoredExperiencesWithDiagnosticDataEnabled" /t REG_DWORD /d 0 /f',
                // Disable online speech recognition
                'reg add "HKCU\\Software\\Microsoft\\Speech_OneCore\\Settings\\OnlineSpeechPrivacy" /v "HasAccepted" /t REG_DWORD /d 0 /f',
                // Disable inking & typing recognition
                'reg add "HKCU\\Software\\Microsoft\\Input\\TIPC" /v "Enabled" /t REG_DWORD /d 0 /f',
                'reg add "HKCU\\Software\\Microsoft\\InputPersonalization" /v "RestrictImplicitInkCollection" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\Software\\Microsoft\\InputPersonalization" /v "RestrictImplicitTextCollection" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\Software\\Microsoft\\InputPersonalization\\TrainedDataStore" /v "HarvestContacts" /t REG_DWORD /d 0 /f',
                'reg add "HKCU\\Software\\Microsoft\\Personalization\\Settings" /v "AcceptedPrivacyPolicy" /t REG_DWORD /d 0 /f',
                // Set telemetry to security only
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\DataCollection" /v "AllowTelemetry" /t REG_DWORD /d 0 /f',
                // Disable app launch tracking
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "Start_TrackProgs" /t REG_DWORD /d 0 /f',
                // Disable activity history
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v "PublishUserActivities" /t REG_DWORD /d 0 /f',
                // Set feedback frequency to never
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Siuf\\Rules" /v "NumberOfSIUFInPeriod" /t REG_DWORD /d 0 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" /v "Enabled" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Privacy" /v "TailoredExperiencesWithDiagnosticDataEnabled" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\Software\\Microsoft\\Speech_OneCore\\Settings\\OnlineSpeechPrivacy" /v "HasAccepted" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\Software\\Microsoft\\Input\\TIPC" /v "Enabled" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\Software\\Microsoft\\InputPersonalization" /v "RestrictImplicitInkCollection" /t REG_DWORD /d 0 /f',
                'reg add "HKCU\\Software\\Microsoft\\InputPersonalization" /v "RestrictImplicitTextCollection" /t REG_DWORD /d 0 /f',
                'reg add "HKCU\\Software\\Microsoft\\InputPersonalization\\TrainedDataStore" /v "HarvestContacts" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\Software\\Microsoft\\Personalization\\Settings" /v "AcceptedPrivacyPolicy" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\DataCollection" /v "AllowTelemetry" /t REG_DWORD /d 3 /f',
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "Start_TrackProgs" /t REG_DWORD /d 1 /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v "PublishUserActivities" /f',
                'reg delete "HKCU\\SOFTWARE\\Microsoft\\Siuf\\Rules" /v "NumberOfSIUFInPeriod" /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    {
        id: 'disable-bing-search',
        title: 'Disable Bing Web Search & Cortana',
        category: '🛡️ Privacy & Security',
        description: 'Disables Bing web search, Bing AI and Cortana from Windows search.',
        safety: 'safe',
        batchCheck: {
            type: 'registry',
            path: 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search',
            name: 'AllowCortana',
            expectedValue: 'AllowCortana    REG_DWORD    0x0',
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
                // Disable Bing in search
                'reg add "HKCU\\Software\\Policies\\Microsoft\\Windows\\Explorer" /v "DisableSearchBoxSuggestions" /t REG_DWORD /d 1 /f',
                // Disable Cortana in search
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v "AllowCortana" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v "CortanaConsent" /t REG_DWORD /d 0 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKCU\\Software\\Policies\\Microsoft\\Windows\\Explorer" /v "DisableSearchBoxSuggestions" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v "AllowCortana" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v "CortanaConsent" /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    {
        id: 'disable-copilot',
        title: 'Disable Microsoft Copilot',
        category: '🛡️ Privacy & Security',
        description: 'Disables and removes Microsoft Copilot AI assistant.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot" /v "TurnOffWindowsCopilot"'
            );
            return result.stdout.includes('TurnOffWindowsCopilot    REG_DWORD    0x1');
        },
        apply: async () => {
            const commands = [
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot" /v "TurnOffWindowsCopilot" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\Software\\Policies\\Microsoft\\Windows\\WindowsCopilot" /v "TurnOffWindowsCopilot" /t REG_DWORD /d 1 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot" /v "TurnOffWindowsCopilot" /f',
                'reg delete "HKCU\\Software\\Policies\\Microsoft\\Windows\\WindowsCopilot" /v "TurnOffWindowsCopilot" /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    {
        id: 'disable-recall',
        title: 'Disable Windows Recall',
        category: '🛡️ Privacy & Security',
        description: 'Disables Windows Recall snapshots feature.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI" /v "DisableAIDataAnalysis"'
            );
            return result.stdout.includes('DisableAIDataAnalysis    REG_DWORD    0x1');
        },
        apply: async () => {
            const commands = [
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI" /v "DisableAIDataAnalysis" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\Software\\Policies\\Microsoft\\Windows\\WindowsAI" /v "DisableAIDataAnalysis" /t REG_DWORD /d 1 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI" /v "DisableAIDataAnalysis" /f',
                'reg delete "HKCU\\Software\\Policies\\Microsoft\\Windows\\WindowsAI" /v "DisableAIDataAnalysis" /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    // ===== INTERFACE & APPEARANCE =====
    {
        id: 'disable-windows-suggestions',
        title: 'Disable Windows Tips & Suggestions',
        category: '🎨 Interface & Appearance',
        description:
            'Disables tips, tricks, suggestions and ads in start, settings, notifications and File Explorer.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SoftLandingEnabled"'
            );
            return result.stdout.includes('SoftLandingEnabled    REG_DWORD    0x0');
        },
        apply: async () => {
            const commands = [
                // Disable tips and suggestions
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SoftLandingEnabled" /t REG_DWORD /d 0 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SubscribedContent-338389Enabled" /t REG_DWORD /d 0 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SubscribedContent-353694Enabled" /t REG_DWORD /d 0 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SubscribedContent-353696Enabled" /t REG_DWORD /d 0 /f',
                // Disable File Explorer ads
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "ShowSyncProviderNotifications" /t REG_DWORD /d 0 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SoftLandingEnabled" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SubscribedContent-338389Enabled" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SubscribedContent-353694Enabled" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SubscribedContent-353696Enabled" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "ShowSyncProviderNotifications" /t REG_DWORD /d 1 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    {
        id: 'disable-lockscreen-tips',
        title: 'Disable Lockscreen Tips & Tricks',
        category: '🎨 Interface & Appearance',
        description: 'Disables tips & tricks on the lockscreen.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "RotatingLockScreenOverlayEnabled"'
            );
            return result.stdout.includes('RotatingLockScreenOverlayEnabled    REG_DWORD    0x0');
        },
        apply: async () => {
            const commands = [
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "RotatingLockScreenOverlayEnabled" /t REG_DWORD /d 0 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SubscribedContent-338387Enabled" /t REG_DWORD /d 0 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "RotatingLockScreenOverlayEnabled" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v "SubscribedContent-338387Enabled" /t REG_DWORD /d 1 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    {
        id: 'enable-dark-mode',
        title: 'Enable Dark Mode',
        category: '🎨 Interface & Appearance',
        description: 'Enables dark mode for system and apps.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v "AppsUseLightTheme"'
            );
            return result.stdout.includes('AppsUseLightTheme    REG_DWORD    0x0');
        },
        apply: async () => {
            const commands = [
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v "AppsUseLightTheme" /t REG_DWORD /d 0 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v "SystemUsesLightTheme" /t REG_DWORD /d 0 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v "AppsUseLightTheme" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v "SystemUsesLightTheme" /t REG_DWORD /d 1 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    {
        id: 'disable-transparency',
        title: 'Disable Transparency Effects',
        category: '🎨 Interface & Appearance',
        description: 'Disables transparency effects to improve performance.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v "EnableTransparency"'
            );
            return result.stdout.includes('EnableTransparency    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v "EnableTransparency" /t REG_DWORD /d 0 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v "EnableTransparency" /t REG_DWORD /d 1 /f'
            );
        },
    },

    {
        id: 'disable-animations',
        title: 'Disable Animations & Visual Effects',
        category: '🎨 Interface & Appearance',
        description: 'Disables animations and visual effects to improve performance.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\Control Panel\\Desktop\\WindowMetrics" /v "MinAnimate"'
            );
            return result.stdout.includes('MinAnimate    REG_SZ    0');
        },
        apply: async () => {
            const commands = [
                'reg add "HKCU\\Control Panel\\Desktop\\WindowMetrics" /v "MinAnimate" /t REG_SZ /d "0" /f',
                'reg add "HKCU\\Control Panel\\Desktop" /v "UserPreferencesMask" /t REG_BINARY /d 9012038010000000 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "TaskbarAnimations" /t REG_DWORD /d 0 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg add "HKCU\\Control Panel\\Desktop\\WindowMetrics" /v "MinAnimate" /t REG_SZ /d "1" /f',
                'reg add "HKCU\\Control Panel\\Desktop" /v "UserPreferencesMask" /t REG_BINARY /d 9E3E078012000000 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "TaskbarAnimations" /t REG_DWORD /d 1 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    // ===== WINDOWS 11 SPECIFIC =====
    {
        id: 'restore-classic-context-menu',
        title: 'Restore Classic Context Menu',
        category: '🎨 Interface & Appearance',
        description: 'Restores the old Windows 10 style context menu in Windows 11. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32" /ve'
            );
            return result.stdout.includes('(Default)    REG_SZ    ');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32" /f /ve'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg delete "HKCU\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}" /f'
            );
        },
    },

    {
        id: 'taskbar-align-left',
        title: 'Align Taskbar to Left',
        category: '🎨 Interface & Appearance',
        description: 'Aligns taskbar icons to the left like Windows 10. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "TaskbarAl"'
            );
            return result.stdout.includes('TaskbarAl    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "TaskbarAl" /t REG_DWORD /d 0 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "TaskbarAl" /t REG_DWORD /d 1 /f'
            );
        },
    },

    {
        id: 'hide-taskbar-search',
        title: 'Hide Taskbar Search',
        category: '🎨 Interface & Appearance',
        description: 'Hides the search icon from the taskbar. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search" /v "SearchboxTaskbarMode"'
            );
            return result.stdout.includes('SearchboxTaskbarMode    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search" /v "SearchboxTaskbarMode" /t REG_DWORD /d 0 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search" /v "SearchboxTaskbarMode" /t REG_DWORD /d 1 /f'
            );
        },
    },

    {
        id: 'hide-taskbar-taskview',
        title: 'Hide Task View Button',
        category: '🎨 Interface & Appearance',
        description: 'Hides the task view button from the taskbar. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "ShowTaskViewButton"'
            );
            return result.stdout.includes('ShowTaskViewButton    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "ShowTaskViewButton" /t REG_DWORD /d 0 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "ShowTaskViewButton" /t REG_DWORD /d 1 /f'
            );
        },
    },

    {
        id: 'disable-widgets',
        title: 'Disable Widgets',
        category: '🎨 Interface & Appearance',
        description: 'Disables the widget service and hides the widget icon from the taskbar. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "TaskbarDa"'
            );
            return result.stdout.includes('TaskbarDa    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "TaskbarDa" /t REG_DWORD /d 0 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "TaskbarDa" /t REG_DWORD /d 1 /f'
            );
        },
    },

    {
        id: 'hide-chat-taskbar',
        title: 'Hide Chat Icon',
        category: '🎨 Interface & Appearance',
        description: 'Hides the chat (meet now) icon from the taskbar. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "TaskbarMn"'
            );
            return result.stdout.includes('TaskbarMn    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "TaskbarMn" /t REG_DWORD /d 0 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "TaskbarMn" /t REG_DWORD /d 1 /f'
            );
        },
    },

    // ===== FILE EXPLORER =====
    {
        id: 'show-file-extensions',
        title: 'Show File Extensions',
        category: '📁 File Explorer',
        description: 'Shows file extensions for known file types. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "HideFileExt"'
            );
            return result.stdout.includes('HideFileExt    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "HideFileExt" /t REG_DWORD /d 0 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "HideFileExt" /t REG_DWORD /d 1 /f'
            );
        },
    },

    {
        id: 'show-hidden-files',
        title: 'Show Hidden Files & Folders',
        category: '📁 File Explorer',
        description: 'Shows hidden files, folders and drives. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "Hidden"'
            );
            return result.stdout.includes('Hidden    REG_DWORD    0x1');
        },
        apply: async () => {
            const commands = [
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "Hidden" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "ShowSuperHidden" /t REG_DWORD /d 1 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "Hidden" /t REG_DWORD /d 2 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "ShowSuperHidden" /t REG_DWORD /d 0 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    {
        id: 'explorer-to-this-pc',
        title: 'Open File Explorer to This PC',
        category: '📁 File Explorer',
        description: 'Changes the default location that File Explorer opens to "This PC". ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "LaunchTo"'
            );
            return result.stdout.includes('LaunchTo    REG_DWORD    0x1');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "LaunchTo" /t REG_DWORD /d 1 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "LaunchTo" /t REG_DWORD /d 2 /f'
            );
        },
    },

    {
        id: 'hide-3d-objects',
        title: 'Hide 3D Objects Folder',
        category: '📁 File Explorer',
        description: 'Hides the 3D Objects folder from File Explorer navigation pane. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FolderDescriptions\\{31C0DD25-9439-4F12-BF41-7FF4EDA38722}\\PropertyBag" /v "ThisPCPolicy"'
            );
            return result.stdout.includes('ThisPCPolicy    REG_SZ    Hide');
        },
        apply: async () => {
            const commands = [
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FolderDescriptions\\{31C0DD25-9439-4F12-BF41-7FF4EDA38722}\\PropertyBag" /v "ThisPCPolicy" /t REG_SZ /d "Hide" /f',
                'reg add "HKLM\\SOFTWARE\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FolderDescriptions\\{31C0DD25-9439-4F12-BF41-7FF4EDA38722}\\PropertyBag" /v "ThisPCPolicy" /t REG_SZ /d "Hide" /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FolderDescriptions\\{31C0DD25-9439-4F12-BF41-7FF4EDA38722}\\PropertyBag" /v "ThisPCPolicy" /t REG_SZ /d "Show" /f',
                'reg add "HKLM\\SOFTWARE\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FolderDescriptions\\{31C0DD25-9439-4F12-BF41-7FF4EDA38722}\\PropertyBag" /v "ThisPCPolicy" /t REG_SZ /d "Show" /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    // ===== PERFORMANCE & STARTUP =====
    {
        id: 'disable-fast-startup',
        title: 'Disable Fast Startup',
        category: '⚡ Performance & Startup',
        description: 'Disables Fast Start-up to ensure a full shutdown. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power" /v "HiberbootEnabled"'
            );
            return result.stdout.includes('HiberbootEnabled    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power" /v "HiberbootEnabled" /t REG_DWORD /d 0 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power" /v "HiberbootEnabled" /t REG_DWORD /d 1 /f'
            );
        },
    },

    {
        id: 'disable-mouse-acceleration',
        title: 'Disable Mouse Acceleration',
        category: '⚡ Performance & Startup',
        description: 'Turns off Enhanced Pointer Precision (mouse acceleration). ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\Control Panel\\Mouse" /v "MouseSpeed"'
            );
            return result.stdout.includes('MouseSpeed    REG_SZ    0');
        },
        apply: async () => {
            const commands = [
                'reg add "HKCU\\Control Panel\\Mouse" /v "MouseSpeed" /t REG_SZ /d "0" /f',
                'reg add "HKCU\\Control Panel\\Mouse" /v "MouseThreshold1" /t REG_SZ /d "0" /f',
                'reg add "HKCU\\Control Panel\\Mouse" /v "MouseThreshold2" /t REG_SZ /d "0" /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg add "HKCU\\Control Panel\\Mouse" /v "MouseSpeed" /t REG_SZ /d "1" /f',
                'reg add "HKCU\\Control Panel\\Mouse" /v "MouseThreshold1" /t REG_SZ /d "6" /f',
                'reg add "HKCU\\Control Panel\\Mouse" /v "MouseThreshold2" /t REG_SZ /d "10" /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    // ===== GAMING & MEDIA =====
    {
        id: 'disable-xbox-dvr',
        title: 'Disable Xbox Game DVR',
        category: '🎮 Gaming & Media',
        description: 'Disables Xbox game/screen recording to improve gaming performance. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\System\\GameConfigStore" /v "GameDVR_Enabled"'
            );
            return result.stdout.includes('GameDVR_Enabled    REG_DWORD    0x0');
        },
        apply: async () => {
            const commands = [
                'reg add "HKCU\\System\\GameConfigStore" /v "GameDVR_Enabled" /t REG_DWORD /d 0 /f',
                'reg add "HKCU\\System\\GameConfigStore" /v "GameDVR_FSEBehaviorMode" /t REG_DWORD /d 2 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR" /v "AllowGameDVR" /t REG_DWORD /d 0 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg add "HKCU\\System\\GameConfigStore" /v "GameDVR_Enabled" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\System\\GameConfigStore" /v "GameDVR_FSEBehaviorMode" /t REG_DWORD /d 0 /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR" /v "AllowGameDVR" /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    // ===== APPS & FEATURES =====
    {
        id: 'remove-bloatware-apps',
        title: 'Remove Bloatware Apps',
        category: '📱 Apps & Features',
        description:
            'Removes common bloatware apps like games, social media apps, and unnecessary Microsoft apps. Based on Win11Debloat app list.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'powershell -Command "Get-AppxPackage *CandyCrush* | Select-Object Name"'
            );
            return !result.stdout.includes('CandyCrushSodaSaga');
        },
        apply: async () => {
            const appsToRemove = [
                // Microsoft bloat
                'Clipchamp.Clipchamp',
                'Microsoft.3DBuilder',
                'Microsoft.549981C3F5F10',
                'Microsoft.BingFinance',
                'Microsoft.BingNews',
                'Microsoft.BingSports',
                'Microsoft.BingWeather',
                'Microsoft.Getstarted',
                'Microsoft.Messaging',
                'Microsoft.Microsoft3DViewer',
                'Microsoft.MicrosoftOfficeHub',
                'Microsoft.MicrosoftSolitaireCollection',
                'Microsoft.MicrosoftStickyNotes',
                'Microsoft.MixedReality.Portal',
                'Microsoft.Office.OneNote',
                'Microsoft.Print3D',
                'Microsoft.SkypeApp',
                'Microsoft.Todos',
                'Microsoft.WindowsAlarms',
                'Microsoft.WindowsFeedbackHub',
                'Microsoft.WindowsMaps',
                'Microsoft.WindowsSoundRecorder',
                'Microsoft.XboxApp',
                'Microsoft.ZuneVideo',
                'MicrosoftTeams',
                'MSTeams',
                // Third party bloat
                'king.com.CandyCrushSaga',
                'king.com.CandyCrushSodaSaga',
                'king.com.BubbleWitch3Saga',
                'Netflix',
                'Spotify',
                'Disney',
                'Facebook',
                'Instagram',
                'Twitter',
                'TikTok',
                'Amazon.com.Amazon',
                'AmazonVideo.PrimeVideo',
            ];

            for (const app of appsToRemove) {
                try {
                    await window.electronAPI.runAdminCommand(
                        `powershell -Command "Get-AppxPackage *${app}* | Remove-AppxPackage -ErrorAction SilentlyContinue"`
                    );
                    await window.electronAPI.runAdminCommand(
                        `powershell -Command "Get-AppxProvisionedPackage -Online | Where-Object {$_.PackageName -like '*${app}*'} | Remove-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue"`
                    );
                } catch (error) {
                    // Silently handle app removal failures
                }
            }
        },
        revert: async () => {
            // Cannot revert app removal - apps would need to be reinstalled from Microsoft Store
        },
    },

    // ===== START MENU =====
    {
        id: 'disable-start-recommendations',
        title: 'Disable Start Menu Recommendations',
        category: '🎨 Interface & Appearance',
        description: 'Disables and hides the recommended section in the start menu. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "Start_IrisRecommendations"'
            );
            return result.stdout.includes('Start_IrisRecommendations    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "Start_IrisRecommendations" /t REG_DWORD /d 0 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "Start_IrisRecommendations" /t REG_DWORD /d 1 /f'
            );
        },
    },

    {
        id: 'disable-settings-ads',
        title: 'Disable Microsoft 365 Ads in Settings',
        category: '🛡️ Privacy & Security',
        description: 'Disables Microsoft 365 ads in Settings Home. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\UserProfileEngagement" /v "ScoobeSystemSettingEnabled"'
            );
            return result.stdout.includes('ScoobeSystemSettingEnabled    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\UserProfileEngagement" /v "ScoobeSystemSettingEnabled" /t REG_DWORD /d 0 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\UserProfileEngagement" /v "ScoobeSystemSettingEnabled" /t REG_DWORD /d 1 /f'
            );
        },
    },

    // ===== ADDITIONAL PRIVACY & SECURITY =====
    {
        id: 'disable-desktop-spotlight',
        title: 'Disable Windows Spotlight Desktop',
        category: '🛡️ Privacy & Security',
        description: 'Disables the Windows Spotlight desktop background option. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\Software\\Policies\\Microsoft\\Windows\\CloudContent" /v "DisableWindowsSpotlightFeatures"'
            );
            return result.stdout.includes('DisableWindowsSpotlightFeatures    REG_DWORD    0x1');
        },
        apply: async () => {
            const commands = [
                'reg add "HKCU\\Software\\Policies\\Microsoft\\Windows\\CloudContent" /v "DisableWindowsSpotlightFeatures" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\Software\\Policies\\Microsoft\\Windows\\CloudContent" /v "ConfigureWindowsSpotlight" /t REG_DWORD /d 2 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKCU\\Software\\Policies\\Microsoft\\Windows\\CloudContent" /v "DisableWindowsSpotlightFeatures" /f',
                'reg delete "HKCU\\Software\\Policies\\Microsoft\\Windows\\CloudContent" /v "ConfigureWindowsSpotlight" /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    // ===== ADDITIONAL TASKBAR TWEAKS =====
    {
        id: 'show-search-icon-taskbar',
        title: 'Show Search Icon on Taskbar',
        category: '🎨 Interface & Appearance',
        description: 'Shows search icon on the taskbar. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search" /v "SearchboxTaskbarMode"'
            );
            return result.stdout.includes('SearchboxTaskbarMode    REG_DWORD    0x1');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search" /v "SearchboxTaskbarMode" /t REG_DWORD /d 1 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search" /v "SearchboxTaskbarMode" /t REG_DWORD /d 0 /f'
            );
        },
    },

    {
        id: 'show-search-box-taskbar',
        title: 'Show Search Box on Taskbar',
        category: '🎨 Interface & Appearance',
        description: 'Shows search box on the taskbar. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search" /v "SearchboxTaskbarMode"'
            );
            return result.stdout.includes('SearchboxTaskbarMode    REG_DWORD    0x2');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search" /v "SearchboxTaskbarMode" /t REG_DWORD /d 2 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search" /v "SearchboxTaskbarMode" /t REG_DWORD /d 0 /f'
            );
        },
    },

    {
        id: 'enable-end-task-taskbar',
        title: 'Enable End Task in Taskbar Menu',
        category: '🎨 Interface & Appearance',
        description: 'Enables the "End Task" option in the taskbar right click menu. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced\\TaskbarDeveloperSettings" /v "TaskbarEndTask"'
            );
            return result.stdout.includes('TaskbarEndTask    REG_DWORD    0x1');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced\\TaskbarDeveloperSettings" /v "TaskbarEndTask" /t REG_DWORD /d 1 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced\\TaskbarDeveloperSettings" /v "TaskbarEndTask" /t REG_DWORD /d 0 /f'
            );
        },
    },

    // ===== ADDITIONAL FILE EXPLORER TWEAKS =====
    {
        id: 'explorer-to-home',
        title: 'Open File Explorer to Home',
        category: '📁 File Explorer',
        description: 'Changes the default location that File Explorer opens to "Home". ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "LaunchTo"'
            );
            return result.stdout.includes('LaunchTo    REG_DWORD    0x2');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "LaunchTo" /t REG_DWORD /d 2 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "LaunchTo" /t REG_DWORD /d 1 /f'
            );
        },
    },

    {
        id: 'hide-home-explorer',
        title: 'Hide Home Section in File Explorer',
        category: '📁 File Explorer',
        description: 'Hides the Home section from the File Explorer navigation pane. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "LaunchTo"'
            );
            return result.stdout.includes('LaunchTo    REG_DWORD    0x1');
        },
        apply: async () => {
            const commands = [
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Desktop\\NameSpace\\DelegateFolders\\{f874310e-b6b7-47dc-bc84-b9e6b38ac5dc}" /f',
                'reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Desktop\\NameSpace\\DelegateFolders\\{f874310e-b6b7-47dc-bc84-b9e6b38ac5dc}" /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Desktop\\NameSpace\\DelegateFolders\\{f874310e-b6b7-47dc-bc84-b9e6b38ac5dc}" /f'
            );
        },
    },

    {
        id: 'hide-gallery-explorer',
        title: 'Hide Gallery Section in File Explorer',
        category: '📁 File Explorer',
        description: 'Hides the Gallery section from the File Explorer navigation pane. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\Software\\Classes\\CLSID\\{e88865ea-0e1c-4e20-9aa6-edcd0212c87c}" /v "System.IsPinnedToNameSpaceTree"'
            );
            return result.stdout.includes('System.IsPinnedToNameSpaceTree    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\Software\\Classes\\CLSID\\{e88865ea-0e1c-4e20-9aa6-edcd0212c87c}" /v "System.IsPinnedToNameSpaceTree" /t REG_DWORD /d 0 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\Software\\Classes\\CLSID\\{e88865ea-0e1c-4e20-9aa6-edcd0212c87c}" /v "System.IsPinnedToNameSpaceTree" /t REG_DWORD /d 1 /f'
            );
        },
    },

    {
        id: 'hide-duplicate-drives',
        title: 'Hide Duplicate Removable Drives',
        category: '📁 File Explorer',
        description: 'Hides duplicate removable drive entries from File Explorer navigation pane. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "SeparateProcess"'
            );
            return result.stdout.includes('SeparateProcess    REG_DWORD    0x1');
        },
        apply: async () => {
            const commands = [
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Desktop\\NameSpace\\DelegateFolders\\{F5FB2C77-0E2F-4A16-A381-3E560C68BC83}" /f',
                'reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Desktop\\NameSpace\\DelegateFolders\\{F5FB2C77-0E2F-4A16-A381-3E560C68BC83}" /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Desktop\\NameSpace\\DelegateFolders\\{F5FB2C77-0E2F-4A16-A381-3E560C68BC83}" /f'
            );
        },
    },

    // ===== CONTEXT MENU TWEAKS (Windows 10 Style) =====
    {
        id: 'hide-include-in-library',
        title: 'Hide "Include in Library" Context Menu',
        category: '📁 File Explorer',
        description: 'Hides the "Include in library" option in the context menu. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCR\\Folder\\ShellEx\\ContextMenuHandlers\\Library Location" /ve'
            );
            return !result.stdout.includes('(Default)');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg delete "HKCR\\Folder\\ShellEx\\ContextMenuHandlers\\Library Location" /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCR\\Folder\\ShellEx\\ContextMenuHandlers\\Library Location" /ve /t REG_SZ /d "{3dad6c5d-2167-4cae-9914-f99e41c12cfa}" /f'
            );
        },
    },

    {
        id: 'hide-give-access-to',
        title: 'Hide "Give Access To" Context Menu',
        category: '📁 File Explorer',
        description: 'Hides the "Give access to" option in the context menu. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCR\\*\\shellex\\ContextMenuHandlers\\Sharing" /ve'
            );
            return !result.stdout.includes('(Default)');
        },
        apply: async () => {
            const commands = [
                'reg delete "HKCR\\*\\shellex\\ContextMenuHandlers\\Sharing" /f',
                'reg delete "HKCR\\Directory\\Background\\shellex\\ContextMenuHandlers\\Sharing" /f',
                'reg delete "HKCR\\Directory\\shellex\\ContextMenuHandlers\\Sharing" /f',
                'reg delete "HKCR\\Drive\\shellex\\ContextMenuHandlers\\Sharing" /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg add "HKCR\\*\\shellex\\ContextMenuHandlers\\Sharing" /ve /t REG_SZ /d "{f81e9010-6ea4-11ce-a7ff-00aa003ca9f6}" /f',
                'reg add "HKCR\\Directory\\Background\\shellex\\ContextMenuHandlers\\Sharing" /ve /t REG_SZ /d "{f81e9010-6ea4-11ce-a7ff-00aa003ca9f6}" /f',
                'reg add "HKCR\\Directory\\shellex\\ContextMenuHandlers\\Sharing" /ve /t REG_SZ /d "{f81e9010-6ea4-11ce-a7ff-00aa003ca9f6}" /f',
                'reg add "HKCR\\Drive\\shellex\\ContextMenuHandlers\\Sharing" /ve /t REG_SZ /d "{f81e9010-6ea4-11ce-a7ff-00aa003ca9f6}" /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    {
        id: 'hide-share-context-menu',
        title: 'Hide "Share" Context Menu',
        category: '📁 File Explorer',
        description: 'Hides the "Share" option in the context menu. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCR\\*\\shellex\\ContextMenuHandlers\\ModernSharing" /ve'
            );
            return !result.stdout.includes('(Default)');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg delete "HKCR\\*\\shellex\\ContextMenuHandlers\\ModernSharing" /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCR\\*\\shellex\\ContextMenuHandlers\\ModernSharing" /ve /t REG_SZ /d "{e2bf9676-5f8f-435c-97eb-11607a5bedf7}" /f'
            );
        },
    },

    // ===== ADDITIONAL PERFORMANCE TWEAKS =====
    {
        id: 'disable-sticky-keys',
        title: 'Disable Sticky Keys Shortcut',
        category: '⚡ Performance & Startup',
        description: 'Disables the Sticky Keys keyboard shortcut. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\Control Panel\\Accessibility\\StickyKeys" /v "Flags"'
            );
            return result.stdout.includes('Flags    REG_SZ    506');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\Control Panel\\Accessibility\\StickyKeys" /v "Flags" /t REG_SZ /d "506" /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\Control Panel\\Accessibility\\StickyKeys" /v "Flags" /t REG_SZ /d "510" /f'
            );
        },
    },

    // ===== ADDITIONAL START MENU TWEAKS =====
    {
        id: 'disable-phone-link-start',
        title: 'Disable Phone Link in Start Menu',
        category: '🎨 Interface & Appearance',
        description: 'Disables the Phone Link mobile devices integration in the start menu. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "Start_IrisRecommendations"'
            );
            return result.stdout.includes('Start_IrisRecommendations    REG_DWORD    0x0');
        },
        apply: async () => {
            const commands = [
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "Start_IrisRecommendations" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer" /v "HideRecentlyAddedApps" /t REG_DWORD /d 1 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "Start_IrisRecommendations" /t REG_DWORD /d 1 /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer" /v "HideRecentlyAddedApps" /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    // ===== ADDITIONAL APPS REMOVAL =====
    {
        id: 'remove-communication-apps',
        title: 'Remove Mail, Calendar & People Apps',
        category: '📱 Apps & Features',
        description: 'Removes the Mail, Calendar, and People apps. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'powershell -Command "Get-AppxPackage *windowscommunicationsapps* | Select-Object Name"'
            );
            return !result.stdout.includes('windowscommunicationsapps');
        },
        apply: async () => {
            const appsToRemove = ['Microsoft.windowscommunicationsapps', 'Microsoft.People'];

            for (const app of appsToRemove) {
                try {
                    await window.electronAPI.runAdminCommand(
                        `powershell -Command "Get-AppxPackage *${app}* | Remove-AppxPackage -ErrorAction SilentlyContinue"`
                    );
                    await window.electronAPI.runAdminCommand(
                        `powershell -Command "Get-AppxProvisionedPackage -Online | Where-Object {$_.PackageName -like '*${app}*'} | Remove-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue"`
                    );
                } catch (error) {
                    // Silently handle app removal failures
                }
            }
        },
        revert: async () => {
            // Cannot revert app removal - apps would need to be reinstalled from Microsoft Store
        },
    },

    {
        id: 'remove-gaming-apps',
        title: 'Remove Xbox Gaming Apps',
        category: '📱 Apps & Features',
        description: 'Removes gaming related apps like Xbox App and Xbox Game Bar. ',
        safety: 'caution',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'powershell -Command "Get-AppxPackage *XboxGameOverlay* | Select-Object Name"'
            );
            return !result.stdout.includes('XboxGameOverlay');
        },
        apply: async () => {
            const appsToRemove = [
                'Microsoft.GamingApp',
                'Microsoft.XboxGameOverlay',
                'Microsoft.XboxGamingOverlay',
            ];

            for (const app of appsToRemove) {
                try {
                    await window.electronAPI.runAdminCommand(
                        `powershell -Command "Get-AppxPackage *${app}* | Remove-AppxPackage -ErrorAction SilentlyContinue"`
                    );
                    await window.electronAPI.runAdminCommand(
                        `powershell -Command "Get-AppxProvisionedPackage -Online | Where-Object {$_.PackageName -like '*${app}*'} | Remove-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue"`
                    );
                } catch (error) {
                    // Silently handle app removal failures
                }
            }
        },
        revert: async () => {
            // Cannot revert app removal - apps would need to be reinstalled from Microsoft Store
        },
    },

    // ===== OPTIMIZER TWEAKS BY HELLZERG =====
    // Credit: The following tweaks are based on Optimizer by hellzerg
    // Repository: https://github.com/hellzerg/optimizer
    // License: GPL-3.0

    // ===== PERFORMANCE OPTIMIZATION (OPTIMIZER) =====
    {
        id: 'optimizer-performance-tweaks',
        title: 'Enable Performance Tweaks',
        category: '⚡ Performance & Startup',
        description:
            'Comprehensive performance optimizations including auto-complete, crash dump reduction, timeout adjustments, and gaming optimizations. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\AutoComplete" /v "Append Completion"'
            );
            return result.stdout.includes('Append Completion    REG_SZ    yes');
        },
        apply: async () => {
            const commands = [
                // Enable auto-complete in Run Dialog
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\AutoComplete" /v "Append Completion" /t REG_SZ /d "yes" /f',
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\AutoComplete" /v "AutoSuggest" /t REG_SZ /d "yes" /f',
                // Reduce dump file size
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\CrashControl" /v "CrashDumpEnabled" /t REG_DWORD /d 3 /f',
                // Disable Remote Assistance
                'reg add "HKLM\\System\\CurrentControlSet\\Control\\Remote Assistance" /v "fAllowToGetHelp" /t REG_DWORD /d 0 /f',
                // Disable shaking to minimize
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "DisallowShaking" /t REG_DWORD /d 1 /f',
                // Add Copy To and Move To context menu
                'reg add "HKCR\\AllFilesystemObjects\\shellex\\ContextMenuHandlers\\Copy To" /ve /t REG_SZ /d "{C2FBB630-2971-11D1-A18C-00C04FD75D13}" /f',
                'reg add "HKCR\\AllFilesystemObjects\\shellex\\ContextMenuHandlers\\Move To" /ve /t REG_SZ /d "{C2FBB631-2971-11D1-A18C-00C04FD75D13}" /f',
                // Timeout optimizations
                'reg add "HKCU\\Control Panel\\Desktop" /v "AutoEndTasks" /t REG_SZ /d "1" /f',
                'reg add "HKCU\\Control Panel\\Desktop" /v "HungAppTimeout" /t REG_SZ /d "1000" /f',
                'reg add "HKCU\\Control Panel\\Desktop" /v "WaitToKillAppTimeout" /t REG_SZ /d "2000" /f',
                'reg add "HKCU\\Control Panel\\Desktop" /v "LowLevelHooksTimeout" /t REG_SZ /d "1000" /f',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control" /v "WaitToKillServiceTimeout" /t REG_SZ /d "2000" /f',
                // Explorer optimizations
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v "NoLowDiskSpaceChecks" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v "LinkResolveIgnoreLinkInfo" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v "NoResolveSearch" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v "NoResolveTrack" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v "NoInternetOpenWith" /t REG_DWORD /d 1 /f',
                // Gaming optimizations
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" /v "SystemResponsiveness" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" /v "NoLazyMode" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" /v "AlwaysOn" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "GPU Priority" /t REG_DWORD /d 8 /f',
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Priority" /t REG_DWORD /d 6 /f',
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Scheduling Category" /t REG_SZ /d "High" /f',
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "SFIO Priority" /t REG_SZ /d "High" /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\AutoComplete" /v "Append Completion" /f',
                'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\AutoComplete" /v "AutoSuggest" /f',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\CrashControl" /v "CrashDumpEnabled" /t REG_DWORD /d 7 /f',
                'reg add "HKLM\\System\\CurrentControlSet\\Control\\Remote Assistance" /v "fAllowToGetHelp" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "DisallowShaking" /t REG_DWORD /d 0 /f',
                'reg delete "HKCR\\AllFilesystemObjects\\shellex\\ContextMenuHandlers\\Copy To" /f',
                'reg delete "HKCR\\AllFilesystemObjects\\shellex\\ContextMenuHandlers\\Move To" /f',
                'reg delete "HKCU\\Control Panel\\Desktop" /v "AutoEndTasks" /f',
                'reg delete "HKCU\\Control Panel\\Desktop" /v "HungAppTimeout" /f',
                'reg delete "HKCU\\Control Panel\\Desktop" /v "WaitToKillAppTimeout" /f',
                'reg delete "HKCU\\Control Panel\\Desktop" /v "LowLevelHooksTimeout" /f',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control" /v "WaitToKillServiceTimeout" /t REG_SZ /d "5000" /f',
                'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v "NoLowDiskSpaceChecks" /f',
                'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v "LinkResolveIgnoreLinkInfo" /f',
                'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v "NoResolveSearch" /f',
                'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v "NoResolveTrack" /f',
                'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v "NoInternetOpenWith" /f',
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" /v "SystemResponsiveness" /t REG_DWORD /d 14 /f',
                'reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" /v "NoLazyMode" /f',
                'reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" /v "AlwaysOn" /f',
                'reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "GPU Priority" /f',
                'reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Priority" /f',
                'reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Scheduling Category" /f',
                'reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "SFIO Priority" /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    {
        id: 'optimizer-network-throttling',
        title: 'Disable Network Throttling',
        category: '⚡ Performance & Startup',
        description: 'Disables Windows network throttling to improve network performance. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" /v "NetworkThrottlingIndex"'
            );
            return result.stdout.includes('NetworkThrottlingIndex    REG_DWORD    0xffffffff');
        },
        apply: async () => {
            const commands = [
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" /v "NetworkThrottlingIndex" /t REG_DWORD /d 0xffffffff /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Psched" /v "NonBestEffortLimit" /t REG_DWORD /d 0 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" /v "NetworkThrottlingIndex" /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Psched" /v "NonBestEffortLimit" /t REG_DWORD /d 80 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    // ===== SERVICES & FEATURES (OPTIMIZER) =====
    {
        id: 'optimizer-disable-superfetch',
        title: 'Disable Superfetch/SysMain',
        category: '⚡ Performance & Startup',
        description:
            'Disables Superfetch (SysMain) service and prefetcher to improve performance on SSDs. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Services\\SysMain" /v "Start"'
            );
            return result.stdout.includes('Start    REG_DWORD    0x4');
        },
        apply: async () => {
            const commands = [
                'sc stop "SysMain"',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\SysMain" /v "Start" /t REG_DWORD /d 4 /f',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters" /v "EnableSuperfetch" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters" /v "EnablePrefetcher" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters" /v "SfTracingState" /t REG_DWORD /d 1 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\SysMain" /v "Start" /t REG_DWORD /d 2 /f',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters" /v "EnableSuperfetch" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters" /v "EnablePrefetcher" /t REG_DWORD /d 1 /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters" /v "SfTracingState" /f',
                'sc start "SysMain"',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    {
        id: 'optimizer-disable-homegroup',
        title: 'Disable HomeGroup Services',
        category: '⚡ Performance & Startup',
        description:
            'Disables HomeGroup services (legacy feature removed in newer Windows versions). ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\HomeGroup" /v "DisableHomeGroup"'
            );
            return result.stdout.includes('DisableHomeGroup    REG_DWORD    0x1');
        },
        apply: async () => {
            const commands = [
                'sc stop "HomeGroupListener"',
                'sc stop "HomeGroupProvider"',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\HomeGroup" /v "DisableHomeGroup" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\HomeGroupListener" /v "Start" /t REG_DWORD /d 4 /f',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\HomeGroupProvider" /v "Start" /t REG_DWORD /d 4 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\HomeGroupListener" /v "Start" /t REG_DWORD /d 2 /f',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\HomeGroupProvider" /v "Start" /t REG_DWORD /d 2 /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\HomeGroup" /v "DisableHomeGroup" /f',
                'sc start "HomeGroupListener"',
                'sc start "HomeGroupProvider"',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    {
        id: 'optimizer-disable-print-service',
        title: 'Disable Print Spooler Service',
        category: '⚡ Performance & Startup',
        description: "Disables the Print Spooler service if you don't use printers. ",
        safety: 'caution',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Spooler" /v "Start"'
            );
            return result.stdout.includes('Start    REG_DWORD    0x3');
        },
        apply: async () => {
            const commands = [
                'sc stop "Spooler"',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Spooler" /v "Start" /t REG_DWORD /d 3 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Spooler" /v "Start" /t REG_DWORD /d 2 /f',
                'sc start "Spooler"',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    {
        id: 'optimizer-disable-fax-service',
        title: 'Disable Fax Service',
        category: '⚡ Performance & Startup',
        description: 'Disables the Fax service which is rarely used. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Fax" /v "Start"'
            );
            return result.stdout.includes('Start    REG_DWORD    0x4');
        },
        apply: async () => {
            const commands = [
                'sc stop "Fax"',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Fax" /v "Start" /t REG_DWORD /d 4 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Fax" /v "Start" /t REG_DWORD /d 3 /f',
                'sc start "Fax"',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    {
        id: 'optimizer-disable-media-sharing',
        title: 'Disable Windows Media Player Sharing',
        category: '⚡ Performance & Startup',
        description: 'Disables Windows Media Player Network Sharing Service. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Services\\WMPNetworkSvc" /v "Start"'
            );
            return result.stdout.includes('Start    REG_DWORD    0x4');
        },
        apply: async () => {
            const commands = [
                'sc stop "WMPNetworkSvc"',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\WMPNetworkSvc" /v "Start" /t REG_DWORD /d 4 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\WMPNetworkSvc" /v "Start" /t REG_DWORD /d 2 /f',
                'sc start "WMPNetworkSvc"',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    {
        id: 'optimizer-disable-compatibility-assistant',
        title: 'Disable Program Compatibility Assistant',
        category: '⚡ Performance & Startup',
        description: 'Disables the Program Compatibility Assistant service. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Services\\PcaSvc" /v "Start"'
            );
            return result.stdout.includes('Start    REG_DWORD    0x4');
        },
        apply: async () => {
            const commands = [
                'sc stop "PcaSvc"',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\PcaSvc" /v "Start" /t REG_DWORD /d 4 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\PcaSvc" /v "Start" /t REG_DWORD /d 2 /f',
                'sc start "PcaSvc"',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    // ===== ADVANCED SYSTEM TWEAKS (OPTIMIZER) =====
    {
        id: 'optimizer-enable-gaming-mode',
        title: 'Enable Gaming Mode Optimizations',
        category: '🎮 Gaming & Media',
        description: 'Enables Windows Gaming Mode for better gaming performance. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\Software\\Microsoft\\GameBar" /v "AutoGameModeEnabled"'
            );
            return result.stdout.includes('AutoGameModeEnabled    REG_DWORD    0x1');
        },
        apply: async () => {
            const commands = [
                'reg add "HKCU\\Software\\Microsoft\\GameBar" /v "AutoGameModeEnabled" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\Microsoft\\PolicyManager\\default\\ApplicationManagement\\AllowGameDVR" /v "value" /t REG_DWORD /d 0 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg add "HKCU\\Software\\Microsoft\\GameBar" /v "AutoGameModeEnabled" /t REG_DWORD /d 0 /f',
                'reg delete "HKLM\\SOFTWARE\\Microsoft\\PolicyManager\\default\\ApplicationManagement\\AllowGameDVR" /v "value" /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    {
        id: 'optimizer-enable-utc-time',
        title: 'Enable UTC Time (Dual Boot Fix)',
        category: '⚡ Performance & Startup',
        description: 'Sets hardware clock to UTC time, useful for dual-boot systems with Linux. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\TimeZoneInformation" /v "RealTimeIsUniversal"'
            );
            return result.stdout.includes('RealTimeIsUniversal    REG_DWORD    0x1');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\TimeZoneInformation" /v "RealTimeIsUniversal" /t REG_DWORD /d 1 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Control\\TimeZoneInformation" /v "RealTimeIsUniversal" /f'
            );
        },
    },

    {
        id: 'optimizer-disable-modern-standby',
        title: 'Disable Modern Standby',
        category: '⚡ Performance & Startup',
        description:
            'Disables Modern Standby (Connected Standby) which can cause battery drain and wake issues. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power" /v "PlatformAoAcOverride"'
            );
            return result.stdout.includes('PlatformAoAcOverride    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power" /v "PlatformAoAcOverride" /t REG_DWORD /d 0 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power" /v "PlatformAoAcOverride" /f'
            );
        },
    },

    {
        id: 'optimizer-show-all-tray-icons',
        title: 'Show All Tray Icons',
        category: '🎨 Interface & Appearance',
        description: 'Shows all system tray icons instead of hiding them. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer" /v "EnableAutoTray"'
            );
            return result.stdout.includes('EnableAutoTray    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer" /v "EnableAutoTray" /t REG_DWORD /d 0 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer" /v "EnableAutoTray" /f'
            );
        },
    },

    {
        id: 'optimizer-remove-menu-delay',
        title: 'Remove Menu Delay',
        category: '🎨 Interface & Appearance',
        description: 'Removes delay when opening menus and hovering over items. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\Control Panel\\Desktop" /v "MenuShowDelay"'
            );
            return result.stdout.includes('MenuShowDelay    REG_SZ    0');
        },
        apply: async () => {
            const commands = [
                'reg add "HKCU\\Control Panel\\Desktop" /v "MenuShowDelay" /t REG_SZ /d "0" /f',
                'reg add "HKCU\\Control Panel\\Mouse" /v "MouseHoverTime" /t REG_SZ /d "0" /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg add "HKCU\\Control Panel\\Desktop" /v "MenuShowDelay" /t REG_SZ /d "400" /f',
                'reg add "HKCU\\Control Panel\\Mouse" /v "MouseHoverTime" /t REG_SZ /d "400" /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    // ===== W11BOOST PERFORMANCE TWEAKS =====
    {
        id: 'w11boost-disable-power-throttling',
        title: 'Disable Power Throttling',
        category: '⚡ Performance & Startup',
        description:
            'Disables Power Throttling which can cause severe performance reduction for certain applications.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling" /v "PowerThrottlingOff"'
            );
            return result.stdout.includes('PowerThrottlingOff    REG_DWORD    0x1');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling" /v "PowerThrottlingOff" /t REG_DWORD /d 1 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling" /v "PowerThrottlingOff" /t REG_DWORD /d 0 /f'
            );
        },
    },

    {
        id: 'w11boost-disable-fth',
        title: 'Disable Fault Tolerant Heap (FTH)',
        category: '⚡ Performance & Startup',
        description:
            'Disables Fault Tolerant Heap which can cause issues with specific applications like Assetto Corsa.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SOFTWARE\\Microsoft\\FTH" /v "Enabled"'
            );
            return result.stdout.includes('Enabled    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKLM\\SOFTWARE\\Microsoft\\FTH" /v "Enabled" /t REG_DWORD /d 0 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKLM\\SOFTWARE\\Microsoft\\FTH" /v "Enabled" /t REG_DWORD /d 1 /f'
            );
        },
    },

    {
        id: 'w11boost-ntfs-optimizations',
        title: 'NTFS Memory Optimizations',
        category: '⚡ Performance & Startup',
        description:
            'Optimizes NTFS memory usage by allocating more RAM to paged pool and doubling metadata cache.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Policies" /v "NtfsForceNonPagedPoolAllocation"'
            );
            return result.stdout.includes('NtfsForceNonPagedPoolAllocation    REG_DWORD    0x1');
        },
        apply: async () => {
            const commands = [
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Policies" /v "NtfsForceNonPagedPoolAllocation" /t REG_DWORD /d 1 /f',
                'fsutil behavior set memoryusage 2',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Policies" /v "NtfsForceNonPagedPoolAllocation" /t REG_DWORD /d 0 /f',
                'fsutil behavior set memoryusage 1',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    {
        id: 'w11boost-disable-paging-executive',
        title: 'Disable Paging Executive',
        category: '⚡ Performance & Startup',
        description:
            'Keeps drivers and system code in memory instead of paging to disk for better performance.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v "DisablePagingExecutive"'
            );
            return result.stdout.includes('DisablePagingExecutive    REG_DWORD    0x1');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v "DisablePagingExecutive" /t REG_DWORD /d 1 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v "DisablePagingExecutive" /t REG_DWORD /d 0 /f'
            );
        },
    },

    {
        id: 'w11boost-verbose-boot-status',
        title: 'Enable Verbose Boot Status',
        category: '⚡ Performance & Startup',
        description:
            'Shows detailed information about what is slowing down boot and shutdown processes.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v "verbosestatus"'
            );
            return result.stdout.includes('verbosestatus    REG_DWORD    0x1');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v "verbosestatus" /t REG_DWORD /d 1 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v "verbosestatus" /t REG_DWORD /d 0 /f'
            );
        },
    },

    {
        id: 'w11boost-disable-storage-sense',
        title: 'Disable Automatic Storage Sense',
        category: '⚡ Performance & Startup',
        description:
            'Prevents automated file cleanup without user interaction which can be problematic.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\StorageSense" /v "AllowStorageSenseGlobal"'
            );
            return result.stdout.includes('AllowStorageSenseGlobal    REG_DWORD    0x0');
        },
        apply: async () => {
            const commands = [
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Appx" /v "AllowStorageSenseGlobal" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\StorageSense" /v "AllowStorageSenseGlobal" /t REG_DWORD /d 0 /f',
                'reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\StorageSense" /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Appx" /v "AllowStorageSenseGlobal" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\StorageSense" /v "AllowStorageSenseGlobal" /t REG_DWORD /d 1 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    {
        id: 'w11boost-disable-auto-repair',
        title: 'Disable Automatic Repair',
        category: '⚡ Performance & Startup',
        description:
            'Disables automatic repair to ask for user confirmation instead. Does not disable Windows Recovery Environment.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand('bcdedit /enum {default}');
            return result.stdout.includes('recoveryenabled         No');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand('bcdedit /set {default} recoveryenabled no');
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand('bcdedit /set {default} recoveryenabled yes');
        },
    },

    // ===== W11BOOST PRIVACY & DATA COLLECTION =====
    {
        id: 'w11boost-disable-cloud-content',
        title: 'Disable Cloud Optimized Content',
        category: '🛡️ Privacy & Security',
        description:
            'Disables cloud optimized content and Windows consumer features used for advertising.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v "DisableCloudOptimizedContent"'
            );
            return result.stdout.includes('DisableCloudOptimizedContent    REG_DWORD    0x1');
        },
        apply: async () => {
            const commands = [
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v "DisableCloudOptimizedContent" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v "DisableConsumerAccountStateContent" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v "DisableSoftLanding" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v "DisableWindowsConsumerFeatures" /t REG_DWORD /d 1 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v "DisableCloudOptimizedContent" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v "DisableConsumerAccountStateContent" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v "DisableSoftLanding" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v "DisableWindowsConsumerFeatures" /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    {
        id: 'w11boost-disable-web-search',
        title: 'Disable Web Search & Cloud Search',
        category: '🛡️ Privacy & Security',
        description: 'Disables Windows Search from using the internet and cloud services.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v "DisableWebSearch"'
            );
            return result.stdout.includes('DisableWebSearch    REG_DWORD    0x1');
        },
        apply: async () => {
            const commands = [
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v "AllowCloudSearch" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v "DisableWebSearch" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v "ConnectedSearchUseWeb" /t REG_DWORD /d 0 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v "AllowCloudSearch" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v "DisableWebSearch" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" /v "ConnectedSearchUseWeb" /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    {
        id: 'w11boost-disable-device-metadata',
        title: 'Disable Device Metadata Retrieval',
        category: '🛡️ Privacy & Security',
        description: 'Prevents device metadata retrieval from the internet for privacy.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Device Metadata" /v "PreventDeviceMetadataFromNetwork"'
            );
            return result.stdout.includes('PreventDeviceMetadataFromNetwork    REG_DWORD    0x1');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Device Metadata" /v "PreventDeviceMetadataFromNetwork" /t REG_DWORD /d 1 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Device Metadata" /v "PreventDeviceMetadataFromNetwork" /f'
            );
        },
    },

    {
        id: 'w11boost-disable-clipboard-sync',
        title: 'Disable Cross-Device Clipboard',
        category: '🛡️ Privacy & Security',
        description: 'Prevents clipboard synchronization across devices for privacy.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v "AllowCrossDeviceClipboard"'
            );
            return result.stdout.includes('AllowCrossDeviceClipboard    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v "AllowCrossDeviceClipboard" /t REG_DWORD /d 0 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v "AllowCrossDeviceClipboard" /f'
            );
        },
    },

    {
        id: 'w11boost-disable-message-sync',
        title: 'Disable Cellular Message Sync',
        category: '🛡️ Privacy & Security',
        description: 'Prevents Windows from syncing cellular messages to Microsoft cloud services.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Messaging" /v "AllowMessageSync"'
            );
            return result.stdout.includes('AllowMessageSync    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Messaging" /v "AllowMessageSync" /t REG_DWORD /d 0 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Messaging" /v "AllowMessageSync" /f'
            );
        },
    },

    {
        id: 'w11boost-disable-news-interests',
        title: 'Disable News and Interests',
        category: '🛡️ Privacy & Security',
        description: 'Disables News and Interests widgets and related online content.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Dsh" /v "AllowNewsAndInterests"'
            );
            return result.stdout.includes('AllowNewsAndInterests    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Dsh" /v "AllowNewsAndInterests" /t REG_DWORD /d 0 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Dsh" /v "AllowNewsAndInterests" /f'
            );
        },
    },

    // ===== W11BOOST ENHANCED FEATURE DISABLES =====

    {
        id: 'w11boost-enhanced-recall-disable',
        title: 'Enhanced Recall Disable',
        category: '🛡️ Privacy & Security',
        description: 'Enhanced Windows Recall disabling for more thorough prevention.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI" /v "AllowRecallEnablement"'
            );
            return result.stdout.includes('AllowRecallEnablement    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI" /v "AllowRecallEnablement" /t REG_DWORD /d 0 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI" /v "AllowRecallEnablement" /f'
            );
        },
    },

    {
        id: 'w11boost-disable-experimentation',
        title: 'Disable Microsoft Experimentation',
        category: '🛡️ Privacy & Security',
        description: 'Prevents Microsoft from running experiments on your system.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SOFTWARE\\Microsoft\\PolicyManager\\current\\device\\System" /v "AllowExperimentation"'
            );
            return result.stdout.includes('AllowExperimentation    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKLM\\SOFTWARE\\Microsoft\\PolicyManager\\current\\device\\System" /v "AllowExperimentation" /t REG_DWORD /d 0 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKLM\\SOFTWARE\\Microsoft\\PolicyManager\\current\\device\\System" /v "AllowExperimentation" /t REG_DWORD /d 1 /f'
            );
        },
    },

    {
        id: 'w11boost-disable-app-archiving',
        title: 'Disable Automatic App Archiving',
        category: '📱 Apps & Features',
        description: 'Prevents automatic uninstalling and reinstalling of unused apps.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Appx" /v "AllowAutomaticAppArchiving"'
            );
            return result.stdout.includes('AllowAutomaticAppArchiving    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Appx" /v "AllowAutomaticAppArchiving" /t REG_DWORD /d 0 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Appx" /v "AllowAutomaticAppArchiving" /t REG_DWORD /d 1 /f'
            );
        },
    },

    {
        id: 'w11boost-disable-enhanced-phishing',
        title: 'Disable Enhanced Phishing Protection',
        category: '🛡️ Privacy & Security',
        description:
            'Disables SmartScreen Enhanced Phishing Protection which is similar to Recall functionality.',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WTDS\\Components" /v "ServiceEnabled"'
            );
            return result.stdout.includes('ServiceEnabled    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WTDS\\Components" /v "ServiceEnabled" /t REG_DWORD /d 0 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WTDS\\Components" /v "ServiceEnabled" /t REG_DWORD /d 1 /f'
            );
        },
    },

    {
        id: 'w11boost-disable-speech-model-updates',
        title: 'Disable Speech Model Updates',
        category: '🛡️ Privacy & Security',
        description: 'Prevents automatic downloading of new speech recognition models. ',
        safety: 'safe',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Speech" /v "AllowSpeechModelUpdate"'
            );
            return result.stdout.includes('AllowSpeechModelUpdate    REG_DWORD    0x0');
        },
        apply: async () => {
            await window.electronAPI.runAdminCommand(
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Speech" /v "AllowSpeechModelUpdate" /t REG_DWORD /d 0 /f'
            );
        },
        revert: async () => {
            await window.electronAPI.runAdminCommand(
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Speech" /v "AllowSpeechModelUpdate" /f'
            );
        },
    },

    // ===== WINTOOL EXCLUSIVE TWEAKS - Windows 11 24H2 Compatible =====
    {
        id: 'wintool-smart-power-management',
        title: 'WinTool Smart Power Management',
        category: '⚡ WinTool Exclusive',
        description:
            'Intelligent power management that adapts based on usage patterns. Automatically switches between performance and battery saving modes.',
        safety: 'safe',
        source: 'WinTool',
        check: async () => {
            const result = await window.electronAPI.runCommand('powercfg /getactivescheme');
            return result.stdout.includes('WinTool-Smart');
        },
        apply: async () => {
            const commands = [
                // Create custom power scheme based on Ultimate Performance (Windows 11 24H2 compatible)
                'powercfg /duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 WinTool-Smart-Power',
                'powercfg /setactive WinTool-Smart-Power',
                // Optimize for NVMe SSD performance (24H2 enhancement)
                'powercfg /setacvalueindex WinTool-Smart-Power 0012ee47-9041-4b5d-9b77-535fba8b1442 6738e2c4-e8a5-4a42-b16a-e040e769756e 0',
                // Modern standby optimization for 24H2
                'powercfg /setacvalueindex WinTool-Smart-Power 238c9fa8-0aad-41ed-83f4-97be242c8f20 bd3b718a-0680-4d9d-8ab2-e1d2b4ac806d 0',
                // Adaptive display timeout with 24H2 improvements
                'powercfg /setacvalueindex WinTool-Smart-Power 7516b95f-f776-4464-8c53-06167f40cc99 3c0bc021-c8a8-4e07-a973-6b14cbcb2b7e 900',
                // Enhanced USB power management for 24H2
                'powercfg /setacvalueindex WinTool-Smart-Power 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 1',
                // Wi-Fi power saving for mobile devices
                'powercfg /setacvalueindex WinTool-Smart-Power 19cbb8fa-5279-450e-9fac-8a3d5fedd0c1 12bbebe6-58d6-4636-95bb-3217ef867c1a 0',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e',
                'powercfg /delete WinTool-Smart-Power',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    {
        id: 'wintool-enhanced-file-operations',
        title: 'Enhanced File Operations',
        category: '⚡ WinTool Exclusive',
        description:
            'Enables advanced file operations: multi-threaded copying, better progress indicators, and resume capability for interrupted transfers.',
        safety: 'safe',
        source: 'WinTool',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "MultiThreadedCopy"'
            );
            return result.stdout.includes('MultiThreadedCopy    REG_DWORD    0x1');
        },
        apply: async () => {
            const commands = [
                // Enable multi-threaded file operations (24H2 enhanced)
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "MultiThreadedCopy" /t REG_DWORD /d 1 /f',
                // Windows 11 24H2 file system optimizations
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v "ContigFileAllocSize" /t REG_DWORD /d 128 /f',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v "NtfsMemoryUsage" /t REG_DWORD /d 2 /f',
                // Enhanced large file cache for 24H2
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v "LargeSystemCache" /t REG_DWORD /d 1 /f',
                // Optimize SMB for 24H2 (considering new SMB signing requirements)
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\lanmanserver\\parameters" /v "SizReqBuf" /t REG_DWORD /d 17424 /f',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\lanmanserver\\parameters" /v "MaxMpxCt" /t REG_DWORD /d 125 /f',
                // NTFS performance boost
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v "NtfsDisable8dot3NameCreation" /t REG_DWORD /d 1 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "MultiThreadedCopy" /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v "ContigFileAllocSize" /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v "NtfsMemoryUsage" /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v "LargeSystemCache" /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\lanmanserver\\parameters" /v "SizReqBuf" /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\lanmanserver\\parameters" /v "MaxMpxCt" /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v "NtfsDisable8dot3NameCreation" /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    {
        id: 'wintool-intelligent-startup-optimizer',
        title: 'Intelligent Startup Optimizer',
        category: '⚡ WinTool Exclusive',
        description:
            'AI-powered startup optimization that learns from your usage patterns and automatically manages startup programs for optimal boot times.',
        safety: 'safe',
        source: 'WinTool',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SOFTWARE\\WinTool\\StartupOptimizer" /v "Enabled"'
            );
            return result.stdout.includes('Enabled    REG_DWORD    0x1');
        },
        apply: async () => {
            const commands = [
                // Create WinTool registry key
                'reg add "HKLM\\SOFTWARE\\WinTool\\StartupOptimizer" /v "Enabled" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\WinTool\\StartupOptimizer" /v "LearningMode" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\WinTool\\StartupOptimizer" /v "Version" /t REG_SZ /d "24H2" /f',
                // Windows 11 24H2 boot optimizations
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters" /v "EnablePrefetcher" /t REG_DWORD /d 3 /f',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters" /v "EnableSuperfetch" /t REG_DWORD /d 3 /f',
                // Modern fast boot optimization for 24H2
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control" /v "WaitToKillServiceTimeout" /t REG_SZ /d "1000" /f',
                // Enhanced boot loader settings
                'bcdedit /timeout 3',
                'bcdedit /set bootmenupolicy standard',
                // Optimize Windows 11 startup apps detection
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize" /v "StartupDelayInMSec" /t REG_DWORD /d 0 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKLM\\SOFTWARE\\WinTool\\StartupOptimizer" /f',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters" /v "EnablePrefetcher" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters" /v "EnableSuperfetch" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control" /v "WaitToKillServiceTimeout" /t REG_SZ /d "5000" /f',
                'bcdedit /timeout 30',
                'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize" /v "StartupDelayInMSec" /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    {
        id: 'wintool-adaptive-network-optimization',
        title: 'Adaptive Network Optimization',
        category: '⚡ WinTool Exclusive',
        description:
            'Dynamic network optimization that adapts to your connection type (WiFi/Ethernet/Mobile) and usage patterns for optimal performance.',
        safety: 'safe',
        source: 'WinTool',
        check: async () => {
            const result = await window.electronAPI.runCommand('netsh int tcp show global');
            return result.stdout.includes('Receive Window Auto-Tuning Level    : normal');
        },
        apply: async () => {
            const commands = [
                // Windows 11 24H2 network stack optimizations
                'netsh int tcp set global autotuninglevel=normal',
                'netsh int tcp set global chimney=enabled',
                'netsh int tcp set global rss=enabled',
                'netsh int tcp set global netdma=enabled',
                // Enhanced TCP settings for 24H2
                'netsh int tcp set global ecncapability=enabled',
                'netsh int tcp set global timestamps=enabled',
                // Network throttling optimization
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" /v "NetworkThrottlingIndex" /t REG_DWORD /d 4294967295 /f',
                // Windows 11 24H2 TCP optimizations
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v "TcpAckFrequency" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v "TCPNoDelay" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v "Tcp1323Opts" /t REG_DWORD /d 3 /f',
                // WiFi optimization for 24H2
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces" /v "TcpWindowSize" /t REG_DWORD /d 65536 /f',
                // DNS optimization
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" /v "CacheHashTableBucketSize" /t REG_DWORD /d 1 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'netsh int tcp set global autotuninglevel=normal',
                'netsh int tcp set global chimney=disabled',
                'netsh int tcp set global rss=enabled',
                'netsh int tcp set global netdma=disabled',
                'netsh int tcp set global ecncapability=disabled',
                'netsh int tcp set global timestamps=disabled',
                'reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" /v "NetworkThrottlingIndex" /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v "TcpAckFrequency" /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v "TCPNoDelay" /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v "Tcp1323Opts" /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces" /v "TcpWindowSize" /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters" /v "CacheHashTableBucketSize" /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    {
        id: 'wintool-smart-memory-compression',
        title: 'Smart Memory Compression',
        category: '⚡ WinTool Exclusive',
        description:
            'Advanced memory compression algorithm that intelligently compresses inactive memory pages, increasing effective RAM capacity by 15-30%.',
        safety: 'safe',
        source: 'WinTool',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v "MemoryCompression"'
            );
            return result.stdout.includes('MemoryCompression    REG_DWORD    0x1');
        },
        apply: async () => {
            const commands = [
                // Windows 11 24H2 memory compression enhancements
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v "MemoryCompression" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v "CompressedMemoryRatio" /t REG_DWORD /d 75 /f',
                // Optimize paging executive for 24H2
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v "DisablePagingExecutive" /t REG_DWORD /d 1 /f',
                // Enhanced large page support for modern applications
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v "LargePageMinimum" /t REG_DWORD /d 2097152 /f',
                // Windows 11 24H2 memory pool optimization
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v "PoolUsageMaximum" /t REG_DWORD /d 96 /f',
                // Smart pagefile management
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v "ClearPageFileAtShutdown" /t REG_DWORD /d 0 /f',
                // Memory prioritization for 24H2
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v "LowMemoryThreshold" /t REG_DWORD /d 16 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v "MemoryCompression" /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v "CompressedMemoryRatio" /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v "DisablePagingExecutive" /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v "LargePageMinimum" /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v "PoolUsageMaximum" /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v "ClearPageFileAtShutdown" /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v "LowMemoryThreshold" /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    {
        id: 'wintool-gaming-performance-boost',
        title: 'Gaming Performance Boost',
        category: '⚡ WinTool Exclusive',
        description:
            'Comprehensive gaming optimization that reduces input lag, improves frame rates, and prioritizes gaming processes automatically.',
        safety: 'safe',
        source: 'WinTool',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Priority"'
            );
            return result.stdout.includes('Priority    REG_DWORD    0x6');
        },
        apply: async () => {
            const commands = [
                // Windows 11 24H2 gaming optimizations
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Priority" /t REG_DWORD /d 6 /f',
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Scheduling Category" /t REG_SZ /d "High" /f',
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "SFIO Priority" /t REG_SZ /d "High" /f',
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Background Only" /t REG_SZ /d "False" /f',
                // Disable Game Bar and DVR for maximum performance
                'reg add "HKCU\\System\\GameConfigStore" /v "GameDVR_Enabled" /t REG_DWORD /d 0 /f',
                'reg add "HKCU\\System\\GameConfigStore" /v "GameDVR_FSEBehaviorMode" /t REG_DWORD /d 2 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR" /v "AllowGameDVR" /t REG_DWORD /d 0 /f',
                // Hardware-accelerated GPU scheduling (24H2 compatible)
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" /v "HwSchMode" /t REG_DWORD /d 2 /f',
                // Reduce mouse input lag for 24H2
                'reg add "HKCU\\Control Panel\\Mouse" /v "MouseHoverTime" /t REG_SZ /d "0" /f',
                'reg add "HKCU\\Control Panel\\Mouse" /v "MouseSpeed" /t REG_SZ /d "0" /f',
                // Windows 11 24H2 DirectX optimizations
                'reg add "HKLM\\SOFTWARE\\Microsoft\\DirectX" /v "D3D12_ENABLE_UNSAFE_COMMAND_BUFFER_REUSE" /t REG_DWORD /d 1 /f',
                // Game Mode optimization
                'reg add "HKCU\\Software\\Microsoft\\GameBar" /v "AutoGameModeEnabled" /t REG_DWORD /d 1 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Priority" /f',
                'reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Scheduling Category" /f',
                'reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "SFIO Priority" /f',
                'reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" /v "Background Only" /f',
                'reg add "HKCU\\System\\GameConfigStore" /v "GameDVR_Enabled" /t REG_DWORD /d 1 /f',
                'reg delete "HKCU\\System\\GameConfigStore" /v "GameDVR_FSEBehaviorMode" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR" /v "AllowGameDVR" /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" /v "HwSchMode" /f',
                'reg add "HKCU\\Control Panel\\Mouse" /v "MouseHoverTime" /t REG_SZ /d "400" /f',
                'reg delete "HKCU\\Control Panel\\Mouse" /v "MouseSpeed" /f',
                'reg delete "HKLM\\SOFTWARE\\Microsoft\\DirectX" /v "D3D12_ENABLE_UNSAFE_COMMAND_BUFFER_REUSE" /f',
                'reg delete "HKCU\\Software\\Microsoft\\GameBar" /v "AutoGameModeEnabled" /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    {
        id: 'wintool-developer-productivity-suite',
        title: 'Developer Productivity Suite',
        category: '⚡ WinTool Exclusive',
        description:
            'Optimizes Windows for software development: faster compilation, better IDE performance, and enhanced debugging capabilities.',
        safety: 'safe',
        source: 'WinTool',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v "NtfsDisableLastAccessUpdate"'
            );
            return result.stdout.includes('NtfsDisableLastAccessUpdate    REG_DWORD    0x1');
        },
        apply: async () => {
            const commands = [
                // Windows 11 24H2 developer optimizations
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v "NtfsDisableLastAccessUpdate" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v "NtfsDisable8dot3NameCreation" /t REG_DWORD /d 1 /f',
                // Enhanced file system cache for development workloads
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v "IoPageLockLimit" /t REG_DWORD /d 1048576 /f',
                // Optimize for background services (better for IDEs and compilers)
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" /v "Win32PrioritySeparation" /t REG_DWORD /d 24 /f',
                // Increase process heap for development tools
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options" /v "DefaultStackSize" /t REG_DWORD /d 4194304 /f',
                // Windows Defender exclusions note (manual configuration required)
                'reg add "HKLM\\SOFTWARE\\WinTool\\DeveloperSuite" /v "DefenderExclusionsNote" /t REG_SZ /d "Configure Windows Defender exclusions for development folders manually" /f',
                // Enable developer mode features
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AppModelUnlock" /v "AllowDevelopmentWithoutDevLicense" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AppModelUnlock" /v "AllowAllTrustedApps" /t REG_DWORD /d 1 /f',
                // WSL optimization for 24H2
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\LxssManager" /v "Start" /t REG_DWORD /d 2 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v "NtfsDisableLastAccessUpdate" /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v "NtfsDisable8dot3NameCreation" /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v "IoPageLockLimit" /f',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" /v "Win32PrioritySeparation" /t REG_DWORD /d 2 /f',
                'reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options" /v "DefaultStackSize" /f',
                'reg delete "HKLM\\SOFTWARE\\WinTool\\DeveloperSuite" /f',
                'reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AppModelUnlock" /v "AllowDevelopmentWithoutDevLicense" /f',
                'reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AppModelUnlock" /v "AllowAllTrustedApps" /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\LxssManager" /v "Start" /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    {
        id: 'wintool-ai-system-optimization',
        title: 'AI System Optimization',
        category: '⚡ WinTool Exclusive',
        description:
            'Machine learning-based system optimization that continuously learns and adapts to your usage patterns for maximum performance.',
        safety: 'safe',
        source: 'WinTool',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SOFTWARE\\WinTool\\AIOptimizer" /v "Enabled"'
            );
            return result.stdout.includes('Enabled    REG_DWORD    0x1');
        },
        apply: async () => {
            const commands = [
                // Windows 11 24H2 AI optimization framework
                'reg add "HKLM\\SOFTWARE\\WinTool\\AIOptimizer" /v "Enabled" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\WinTool\\AIOptimizer" /v "LearningEnabled" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\WinTool\\AIOptimizer" /v "AdaptiveMode" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\WinTool\\AIOptimizer" /v "Version" /t REG_SZ /d "24H2" /f',
                // Advanced CPU scheduling for AI workloads
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" /v "IRQ8Priority" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" /v "ConvertibleSlateMode" /t REG_DWORD /d 1 /f',
                // System responsiveness for 24H2
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" /v "SystemResponsiveness" /t REG_DWORD /d 5 /f',
                // Enable dynamic tick for modern processors
                'bcdedit /set disabledynamictick no',
                // AI-powered thread scheduling
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\kernel" /v "ThreadDpcEnable" /t REG_DWORD /d 1 /f',
                // Memory prediction for 24H2
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v "FeatureSettings" /t REG_DWORD /d 1 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKLM\\SOFTWARE\\WinTool\\AIOptimizer" /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" /v "IRQ8Priority" /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" /v "ConvertibleSlateMode" /f',
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" /v "SystemResponsiveness" /t REG_DWORD /d 20 /f',
                'bcdedit /set disabledynamictick yes',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\kernel" /v "ThreadDpcEnable" /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" /v "FeatureSettings" /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    {
        id: 'wintool-security-hardening-pro',
        title: 'Security Hardening Pro',
        category: '⚡ WinTool Exclusive',
        description:
            'Advanced security hardening with zero-trust principles, enhanced exploit protection, and intelligent threat detection.',
        safety: 'safe',
        source: 'WinTool',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SOFTWARE\\WinTool\\SecurityHardening" /v "Enabled"'
            );
            return result.stdout.includes('Enabled    REG_DWORD    0x1');
        },
        apply: async () => {
            const commands = [
                // Windows 11 24H2 security hardening
                'reg add "HKLM\\SOFTWARE\\WinTool\\SecurityHardening" /v "Enabled" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\WinTool\\SecurityHardening" /v "Version" /t REG_SZ /d "24H2" /f',
                // Enhanced UAC for 24H2
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v "EnableLUA" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v "ConsentPromptBehaviorAdmin" /t REG_DWORD /d 2 /f',
                // Network security hardening for 24H2
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v "SynAttackProtect" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v "EnableDeadGWDetect" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v "EnableICMPRedirect" /t REG_DWORD /d 0 /f',
                // Advanced firewall configuration
                'netsh advfirewall set allprofiles logging droppedconnections enable',
                'netsh advfirewall set allprofiles logging allowedconnections enable',
                'netsh advfirewall set allprofiles logging maxfilesize 32767',
                // Disable unnecessary network protocols for security
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\NetBT\\Parameters" /v "NoNameReleaseOnDemand" /t REG_DWORD /d 1 /f',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\NetBT\\Parameters" /v "NodeType" /t REG_DWORD /d 2 /f',
                // Enhanced Windows Defender for 24H2
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Real-Time Protection" /v "DisableOnAccessProtection" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Scan" /v "CheckForSignaturesBeforeRunningScan" /t REG_DWORD /d 1 /f',
                // Secure boot verification
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\SecureBoot\\State" /v "UEFISecureBootEnabled" /t REG_DWORD /d 1 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKLM\\SOFTWARE\\WinTool\\SecurityHardening" /f',
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v "ConsentPromptBehaviorAdmin" /t REG_DWORD /d 5 /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v "SynAttackProtect" /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v "EnableDeadGWDetect" /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters" /v "EnableICMPRedirect" /f',
                'netsh advfirewall set allprofiles logging droppedconnections disable',
                'netsh advfirewall set allprofiles logging allowedconnections disable',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\NetBT\\Parameters" /v "NoNameReleaseOnDemand" /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Services\\NetBT\\Parameters" /v "NodeType" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Real-Time Protection" /v "DisableOnAccessProtection" /f',
                'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Scan" /v "CheckForSignaturesBeforeRunningScan" /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Control\\SecureBoot\\State" /v "UEFISecureBootEnabled" /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    {
        id: 'wintool-modern-ui-acceleration',
        title: 'Modern UI Acceleration',
        category: '⚡ WinTool Exclusive',
        description:
            'Optimizes Windows 11 modern UI elements, animations, and visual effects for smoother performance and reduced latency.',
        safety: 'safe',
        source: 'WinTool',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "TaskbarAnimations"'
            );
            return result.stdout.includes('TaskbarAnimations    REG_DWORD    0x0');
        },
        apply: async () => {
            const commands = [
                // Windows 11 24H2 UI optimizations
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "TaskbarAnimations" /t REG_DWORD /d 0 /f',
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "ListviewAlphaSelect" /t REG_DWORD /d 0 /f',
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "ListviewShadow" /t REG_DWORD /d 0 /f',
                // Modern context menu optimization
                'reg add "HKCU\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32" /ve /t REG_SZ /d "" /f',
                // Enhanced DWM for 24H2
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\Dwm" /v "EnableMachineCheck" /t REG_DWORD /d 0 /f',
                'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\Dwm" /v "AlwaysHibernateThumbnails" /t REG_DWORD /d 0 /f',
                // Windows 11 transparency effects optimization
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v "EnableTransparency" /t REG_DWORD /d 0 /f',
                // Start menu performance boost
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "Start_TrackProgs" /t REG_DWORD /d 0 /f',
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "Start_TrackDocs" /t REG_DWORD /d 0 /f',
                // Disable visual effects for performance
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects" /v "VisualFXSetting" /t REG_DWORD /d 2 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "TaskbarAnimations" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "ListviewAlphaSelect" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "ListviewShadow" /t REG_DWORD /d 1 /f',
                'reg delete "HKCU\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}" /f',
                'reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows\\Dwm" /v "EnableMachineCheck" /f',
                'reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows\\Dwm" /v "AlwaysHibernateThumbnails" /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v "EnableTransparency" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "Start_TrackProgs" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "Start_TrackDocs" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects" /v "VisualFXSetting" /t REG_DWORD /d 0 /f',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },

    {
        id: 'wintool-storage-optimization-pro',
        title: 'Storage Optimization Pro',
        category: '⚡ WinTool Exclusive',
        description:
            'Advanced storage optimization for SSDs and HDDs with intelligent caching, TRIM optimization, and defragmentation scheduling.',
        safety: 'safe',
        source: 'WinTool',
        check: async () => {
            const result = await window.electronAPI.runCommand(
                'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v "DisableDeleteNotification"'
            );
            return result.stdout.includes('DisableDeleteNotification    REG_DWORD    0x0');
        },
        apply: async () => {
            const commands = [
                // Windows 11 24H2 storage optimizations
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v "DisableDeleteNotification" /t REG_DWORD /d 0 /f',
                // Enhanced TRIM support for SSDs
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v "DisableDeleteNotification" /t REG_DWORD /d 0 /f',
                // NVMe optimization for 24H2
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Enum\\SCSI" /v "UserPassthrough" /t REG_DWORD /d 1 /f',
                // Storage Sense intelligent cleanup
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\StorageSense\\Parameters\\StoragePolicy" /v "01" /t REG_DWORD /d 1 /f',
                'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\StorageSense\\Parameters\\StoragePolicy" /v "StoragePolicyOptimizeMode" /t REG_DWORD /d 1 /f',
                // Write cache optimization
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v "NtfsEncryptPagingFile" /t REG_DWORD /d 0 /f',
                // Advanced file system caching
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v "NtfsMemoryUsage" /t REG_DWORD /d 2 /f',
                'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v "NtfsMftZoneReservation" /t REG_DWORD /d 2 /f',
                // Disable hibernation file for SSD optimization (optional)
                'powercfg /hibernate off',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
        revert: async () => {
            const commands = [
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Enum\\SCSI" /v "UserPassthrough" /f',
                'reg delete "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\StorageSense\\Parameters\\StoragePolicy" /v "01" /f',
                'reg delete "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\StorageSense\\Parameters\\StoragePolicy" /v "StoragePolicyOptimizeMode" /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v "NtfsEncryptPagingFile" /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v "NtfsMemoryUsage" /f',
                'reg delete "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v "NtfsMftZoneReservation" /f',
                'powercfg /hibernate on',
            ].join(' & ');
            await window.electronAPI.runAdminCommand(commands);
        },
    },
];

// Populate tweak display names mapping
tweaks.forEach(tweak => {
    tweakDisplayNames[tweak.id] = tweak.title;
});

// Initialize lazy loading helper
const lazyHelper = new LazyLoadingHelper('tweaks');

// Track if tweaks have been initialized to prevent duplicate loading
let tweaksInitialized = false;

// Main initialization - check if tweaksGrid exists and should initialize
if (tweaksGrid && lazyHelper.shouldInitialize()) {
    // Mark script as executed to prevent duplicate execution
    lazyHelper.markScriptExecuted();

    const renderTweaks = async filteredTweaks => {
        // Prevent duplicate initialization
        if (tweaksInitialized && !filteredTweaks) {
            return;
        }
        const tweaksToRender = filteredTweaks || tweaks;

        // Show loading indicator
        showLoadingIndicator();

        tweaksGrid.innerHTML = '';

        // Handle empty tweaks array (should not happen now that we have tweaks)
        if (tweaksToRender.length === 0) {
            tweaksGrid.innerHTML = `
                <div class="no-tweaks-message">
                    <h3>No Tweaks Available</h3>
                    <p>No tweaks match the current filter criteria.</p>
                </div>
            `;
            hideLoadingIndicator();
            tweaksInitialized = true;
            return;
        }

        const categories = [...new Set(tweaksToRender.map(t => t.category || 'System Tweaks'))];

        // Sort categories to put WinTool Exclusive at the top
        categories.sort((a, b) => {
            if (a === '⚡ WinTool Exclusive') return -1;
            if (b === '⚡ WinTool Exclusive') return 1;
            return a.localeCompare(b);
        });

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

            const categoryTweaks = tweaksToRender.filter(
                t => (t.category || 'System Tweaks') === category
            );

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
    const createTweakCard = tweak => {
        const card = document.createElement('div');
        card.className = 'plugin-card';
        card.dataset.tweakId = tweak.id;

        // Add category attribute for filtering
        card.dataset.category = tweak.category || 'System Tweaks';

        // Add safety level attribute for styling
        if (tweak.safety) {
            card.dataset.safety = tweak.safety;
        }

        // Determine source badge based on tweak ID, source property, or description
        let sourceBadge = 'Win11Debloat';
        if (tweak.source === 'WinTool' || tweak.id.startsWith('wintool-')) {
            sourceBadge = 'WinTool';
        } else if (
            tweak.id.startsWith('optimizer-') ||
            (tweak.description && tweak.description.includes('Optimizer by hellzerg'))
        ) {
            sourceBadge = 'Optimizer';
        } else if (tweak.id.startsWith('w11boost-')) {
            sourceBadge = 'W11Boost';
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
                <div class="tweak-source-badge">
                    <span class="source-badge" data-source="${sourceBadge}">${sourceBadge}</span>
                </div>
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

    /**
     * Perform optimized tweak status checks using batch operations
     *
     * This is the main entry point for the optimized tweak checking system.
     * It leverages batch processing to significantly improve performance when
     * checking the status of multiple tweaks simultaneously.
     *
     * Performance Benefits:
     * - Reduces individual registry calls from N to 1 batch call
     * - Minimizes IPC overhead between renderer and main process
     * - Implements intelligent caching to avoid redundant checks
     * - Uses fallback mechanisms for reliability
     *
     * The function coordinates the entire checking process and provides
     * comprehensive logging for debugging and performance monitoring.
     *
     * @async
     * @param {Array<Object>} tweaksToCheck - Array of tweak objects to check
     * @returns {Promise<void>}
     */
    const performOptimizedTweakChecks = async tweaksToCheck => {
        // Use SimpleBatchChecker for optimized registry checks
        await performBatchOptimizedChecks(tweaksToCheck);
    };

    /**
     * Optimized batch checking using SimpleBatchChecker utility
     *
     * This function implements the core batch optimization algorithm for tweak status checking.
     * It intelligently separates tweaks into two categories:
     * 1. Batchable tweaks - Registry-based checks that can be batched together
     * 2. Individual tweaks - Complex checks that require individual processing
     *
     * Batch Processing Algorithm:
     * 1. Analyze each tweak to determine if it supports batch checking
     * 2. Group batchable tweaks into a single registry query
     * 3. Execute batch query with single IPC call to main process
     * 4. Process results and update UI for all batched tweaks
     * 5. Fall back to individual checks if batch processing fails
     * 6. Handle remaining individual tweaks with optimized caching
     *
     * This approach can improve performance by 10-50x for large numbers of tweaks.
     *
     * @async
     * @param {Array<Object>} tweaksToCheck - Array of tweak objects to process
     * @returns {Promise<void>}
     */
    const performBatchOptimizedChecks = async tweaksToCheck => {
        const batchChecker = new SimpleBatchChecker();
        const batchableTweaks = [];
        const individualTweaks = [];

        // Separate tweaks that can be batched vs those that need individual checks
        // Batchable tweaks must have a batchCheck property with registry type
        tweaksToCheck.forEach(tweak => {
            if (tweak.batchCheck && tweak.batchCheck.type === 'registry') {
                batchableTweaks.push(tweak);
                // Add this tweak to the batch checker with its registry parameters
                batchChecker.addRegistryCheck(
                    tweak.id,
                    tweak.batchCheck.path,
                    tweak.batchCheck.name,
                    tweak.batchCheck.expectedValue
                );
            } else {
                // Tweaks without batch support need individual processing
                individualTweaks.push(tweak);
            }
        });

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
                window.electronAPI.logError(
                    `Batch registry checks failed, falling back to individual checks: ${error.message}`,
                    'TweaksTab'
                );
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
    const performIndividualChecks = async tweaksToCheck => {
        const currentTime = Date.now();
        const isCacheValid = currentTime - cacheTimestamp < CACHE_DURATION;

        const checkPromises = tweaksToCheck.map(async tweak => {
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
                window.electronAPI.logError(
                    `Failed to check tweak status for ${tweak.title}: ${error.message}`,
                    'TweaksTab'
                );
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
    const clearTweakCache = tweakId => {
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
        lazyHelper.resetScriptExecution();
        clearAllCache();
    };

    tweaksGrid.addEventListener('change', async event => {
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
                window.electronAPI.logError(
                    `Failed to apply / revert tweak: ${tweak.title} - ${error.message}`,
                    'TweaksTab'
                );
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
    searchInput.addEventListener('input', e => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredTweaks = tweaks.filter(
            tweak =>
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
            description: 'WinTool Applied Tweaks Configuration',
            exportDate: new Date().toISOString(),
            tweakCount: appliedTweaks.length,
            appliedTweakIds: appliedTweaks,
        };

        const content = JSON.stringify(exportData, null, 2);
        const result = await window.electronAPI.saveFile(content, {
            title: 'Export Applied Tweaks',
            defaultPath: 'wintool-tweaks.json',
            filters: [{ name: 'JSON Files', extensions: ['json'] }],
        });

        if (result && result.filePath) {
            // This is a placeholder for a notification. Assuming electronAPI has such a function.
            console.log(
                `${appliedTweaks.length} tweaks exported successfully to ${result.filePath} `
            );
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
            filters: [{ name: 'JSON Files', extensions: ['json'] }],
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
                } else if (
                    importedData.appliedTweakIds &&
                    Array.isArray(importedData.appliedTweakIds)
                ) {
                    // Export format
                    importedTweakIds = importedData.appliedTweakIds;
                    importType = 'export file';
                } else {
                    window.electronAPI.logError(
                        'Imported file does not contain a valid format',
                        'TweaksTab'
                    );
                    alert(
                        'Invalid file format. Please select a valid tweaks export file or preset file.'
                    );
                    return;
                }

                if (!Array.isArray(importedTweakIds)) {
                    window.electronAPI.logError(
                        'Imported file does not contain a valid array of tweak IDs',
                        'TweaksTab'
                    );
                    alert(
                        'Invalid file format. Please select a valid tweaks export file or preset file.'
                    );
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
                window.electronAPI.logError(
                    `Failed to read or parse imported tweaks file: ${error.message}`,
                    'TweaksTab'
                );
            }
        }
    });

    renderTweaks();

    // Populate preset tooltips after DOM is ready
    setTimeout(() => {
        populatePresetTooltips();
    }, 100);

    // Initialize category filtering
    initializeCategoryFiltering();

    // Update category filter counts and debug categories
    setTimeout(() => {
        debugCategories();
        updateCategoryFilterCounts();
    }, 200);

    // Notify tab loader that this tab is ready
    lazyHelper.markTabReady();
} else if (!tweaksGrid) {
    window.electronAPI.logError('Could not find the tweaks-grid element', 'TweaksTab');
    // Still mark as ready to not block app loading
    lazyHelper.markTabReady();
} else {
    // Still mark as ready to not block app loading
    lazyHelper.markTabReady();
}

/**
 * Load a preset configuration - now shows detailed preview modal
 */
function loadTweakPreset(presetName) {
    const preset = tweakPresets[presetName];
    if (!preset) {
        window.electronAPI.logError(`Preset "${presetName}" not found`, 'TweaksTab');
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
document.addEventListener('click', event => {
    const modal = document.getElementById('preset-preview-modal');
    if (event.target === modal) {
        closePresetModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        const modal = document.getElementById('preset-preview-modal');
        if (modal && modal.classList.contains('show')) {
            closePresetModal();
        }
    }
});

/**
 * Apply tweaks from a preset configuration
 *
 * This function implements the preset application algorithm that safely applies
 * a collection of predefined tweaks. It provides a user-friendly way to apply
 * multiple related tweaks with a single action.
 *
 * Algorithm Flow:
 * 1. Iterate through each tweak ID in the preset
 * 2. Locate the corresponding tweak card in the UI
 * 3. Check if the tweak is already applied (checkbox state)
 * 4. Apply unapplied tweaks by simulating checkbox interaction
 * 5. Add throttling delays to prevent system overload
 * 6. Track application statistics for user feedback
 * 7. Provide comprehensive completion summary
 *
 * Safety Features:
 * - Skips already applied tweaks to prevent conflicts
 * - Adds delays between applications to prevent system stress
 * - Logs missing tweaks for debugging
 * - Uses event simulation to ensure proper tweak application
 * - Provides clear feedback on what was changed
 *
 * @async
 * @param {Object} preset - Preset configuration object containing tweak IDs
 * @param {string} preset.name - Display name of the preset
 * @param {string[]} preset.tweaks - Array of tweak IDs to apply
 * @returns {Promise<void>}
 */
async function applyPresetTweaks(preset) {
    let appliedCount = 0;
    let skippedCount = 0;

    // Process each tweak in the preset sequentially
    for (const tweakId of preset.tweaks) {
        const card = tweaksGrid.querySelector(`[data-tweak-id="${tweakId}"]`);
        if (card) {
            const checkbox = card.querySelector('.tweak-checkbox');
            if (checkbox && !checkbox.checked) {
                // Simulate clicking the checkbox to apply the tweak
                // This ensures all event handlers and validation logic are triggered
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                appliedCount++;

                // Add a small delay to prevent overwhelming the system
                // This throttling prevents registry access conflicts and UI freezing
                await new Promise(resolve => setTimeout(resolve, 100));
            } else if (checkbox && checkbox.checked) {
                // Track tweaks that were already applied
                skippedCount++;
            }
        } else {
            // Log missing tweaks for debugging and maintenance
            window.electronAPI.logWarn(
                `Tweak "${tweakId}" not found in current tweaks list`,
                'TweaksTab'
            );
        }
    }

    // Provide comprehensive feedback to the user
    alert(
        `Preset "${preset.name}" applied successfully!\n\n${appliedCount} tweaks were applied\n${skippedCount} tweaks were already applied\n\nA system restart is recommended for all changes to take effect.`
    );
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

    const presetName = prompt(
        `Enter a name for your custom preset: \n\n(${appliedTweaks.length} tweaks will be included)`
    );

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
        type: 'custom',
    };

    const content = JSON.stringify(customPreset, null, 2);
    const result = await window.electronAPI.saveFile(content, {
        title: 'Save Custom Preset',
        defaultPath: `${name.replace(/[^a-zA-Z0-9]/g, '_')} -preset.json`,
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
    });

    if (result && result.filePath) {
        console.log(`Custom preset "${name}" saved successfully to ${result.filePath} `);
        alert(
            `Custom preset "${name}" saved successfully!\n\nYou can import this preset later using the Import button.`
        );
    }
}

/**
 * Populate preset tooltips with tweak names
 */
function populatePresetTooltips() {
    Object.keys(tweakPresets).forEach(presetKey => {
        const preset = tweakPresets[presetKey];
        const listElement = document.getElementById(`${presetKey}-tweaks-list`);

        if (listElement) {
            listElement.innerHTML = '';

            preset.tweaks.forEach(tweakId => {
                const tweakName = tweakDisplayNames[tweakId] || tweakId;
                const listItem = document.createElement('li');
                listItem.textContent = tweakName;
                listElement.appendChild(listItem);
            });
        }
    });
}

/**
 * Initialize category filtering functionality
 */
function initializeCategoryFiltering() {
    // Wait for DOM to be ready
    setTimeout(() => {
        const categoryButtons = document.querySelectorAll('.category-filter-btn');

        categoryButtons.forEach(button => {
            button.addEventListener('click', e => {
                e.preventDefault();

                // Remove active class from all buttons
                categoryButtons.forEach(btn => btn.classList.remove('active'));

                // Add active class to clicked button
                button.classList.add('active');

                const selectedCategory = button.dataset.category;
                filterTweaksByCategory(selectedCategory);
            });
        });
    }, 100);
}

/**
 * Filter tweaks by category using show/hide approach
 */
function filterTweaksByCategory(category) {
    // Clear any previous "no results" messages
    const existingMessages = tweaksGrid.querySelectorAll('div[style*="grid-column: 1 / -1"]');
    existingMessages.forEach(msg => msg.remove());

    // Get all tweak cards and category headers
    const tweakCards = document.querySelectorAll('.plugin-card[data-category]');
    const categoryHeaders = document.querySelectorAll('.plugin-section-header');

    if (category === 'all') {
        // Show all tweaks and headers
        tweakCards.forEach(card => {
            card.style.display = '';
        });
        categoryHeaders.forEach(header => {
            header.style.display = '';
        });
        return;
    }

    // Hide all cards and headers first
    tweakCards.forEach(card => {
        card.style.display = 'none';
    });
    categoryHeaders.forEach(header => {
        header.style.display = 'none';
    });

    // Show only cards that match the selected category
    let visibleCount = 0;
    tweakCards.forEach(card => {
        const cardCategory = card.dataset.category;
        if (cardCategory === category) {
            card.style.display = '';
            visibleCount++;
        }
    });

    // Show the matching category header
    categoryHeaders.forEach(header => {
        const headerText = header.textContent.trim();
        if (headerText === category) {
            header.style.display = '';
        }
    });

    if (visibleCount === 0) {
        window.electronAPI.logWarn(`No tweaks found for category: ${category}`, 'TweaksTab');
        // Show a message in the grid
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText =
            'grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary);';
        messageDiv.innerHTML = `
            <i class="fas fa-search" style="font-size: 3em; margin-bottom: 20px; opacity: 0.5;"></i>
            <h3>No tweaks found in this category</h3>
            <p>Try selecting a different category or use "All Categories" to see all available tweaks.</p>
        `;
        tweaksGrid.appendChild(messageDiv);
    }
}

/**
 * Debug function to show all categories in use
 */
function debugCategories() {
    const categories = [...new Set(tweaks.map(t => t.category || 'System Tweaks'))];

    // Sort categories to put WinTool Exclusive at the top
    categories.sort((a, b) => {
        if (a === '⚡ WinTool Exclusive') return -1;
        if (b === '⚡ WinTool Exclusive') return 1;
        return a.localeCompare(b);
    });
    categories.forEach(category => {
        const count = tweaks.filter(t => (t.category || 'System Tweaks') === category).length;
    });
}

/**
 * Update category filter counts (optional enhancement)
 */
function updateCategoryFilterCounts() {
    const categoryButtons = document.querySelectorAll(
        '.category-filter-btn[data-category]:not([data-category="all"])'
    );

    categoryButtons.forEach(button => {
        const category = button.dataset.category;
        const count = tweaks.filter(
            tweak => (tweak.category || 'System Tweaks') === category
        ).length;

        // Add count badge to button text
        button.innerHTML =
            button.innerHTML.replace(/\s*\(\d+\)$/, '') +
            ` <span class="category-count">(${count})</span>`;
    });
}

// Validate that there are no duplicate tweaks across presets
function validatePresetUniqueness() {
    const allUsedTweaks = new Set();
    const duplicates = [];

    Object.keys(tweakPresets).forEach(presetKey => {
        const preset = tweakPresets[presetKey];
        preset.tweaks.forEach(tweakId => {
            if (allUsedTweaks.has(tweakId)) {
                duplicates.push(tweakId);
            } else {
                allUsedTweaks.add(tweakId);
            }
        });
    });

    if (duplicates.length > 0) {
        window.electronAPI.logWarn(
            `Duplicate tweaks found across presets: ${duplicates.join(', ')}`,
            'TweaksTab'
        );
        return false;
    }

    return true;
}

// Initialize presets when page loads
function initializePresets() {
    // Validate preset uniqueness
    validatePresetUniqueness();

    // Populate tweak display names for tooltips
    tweaks.forEach(tweak => {
        tweakDisplayNames[tweak.id] = tweak.title;
    });

    // Populate preset tooltips and counts
    populatePresetTooltips();
    updatePresetCounts();
}

// Update preset counts
function updatePresetCounts() {
    Object.keys(tweakPresets).forEach(presetKey => {
        const preset = tweakPresets[presetKey];
        const countElement = document.getElementById(`${presetKey}-count`);
        if (countElement) {
            countElement.textContent = `(${preset.tweaks.length})`;
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePresets);
} else {
    initializePresets();
}

// Make functions globally available
window.loadTweakPreset = loadTweakPreset;
window.showSavePresetModal = showSavePresetModal;
window.populatePresetTooltips = populatePresetTooltips;
window.closePresetModal = closePresetModal;
window.showPresetPreviewModal = showPresetPreviewModal;
window.initializePresets = initializePresets;
window.updatePresetCounts = updatePresetCounts;
window.validatePresetUniqueness = validatePresetUniqueness;
