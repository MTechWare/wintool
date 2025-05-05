/**
 * WinTool - Tweaks Module
 * Handles Windows registry tweaks and system optimizations
 */

// ===================================================
// IMPORTS AND CONSTANTS
// ===================================================
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs');
const path = require('path');
const os = require('os');
const { readRegistryValue } = require('./registry-utils');

// Path to store persistent tweak settings
const TWEAKS_STORAGE_PATH = path.join(__dirname, '..', 'data');
const TWEAKS_FILE_PATH = path.join(TWEAKS_STORAGE_PATH, 'tweaks.json');

// ===================================================
// UTILITY FUNCTIONS
// ===================================================

/**
 * Check Windows version
 * @returns {boolean} True if Windows 11, false otherwise
 */
const isWindows11 = () => {
    const release = os.release().split('.');
    return parseInt(release[0]) >= 10 && parseInt(release[2]) >= 22000;
};

// Registry paths that are common to both Windows 10 and 11
const REG_PATHS = {
    VISUAL_EFFECTS: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects',
    FILE_EXPLORER: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced',
    TELEMETRY: 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection',
    ADVERTISING_ID: 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo',
    DESKTOP_ICONS: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\HideDesktopIcons\\NewStartPanel',
    LOCK_SCREEN: 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Personalization',
    CORTANA: 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search',
    TASKBAR: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced',
    CLOCK: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced',
    STARTUP_SOUND: 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Authentication\\LogonUI\\BootAnimation',
    ANIMATIONS: 'HKCU\\Control Panel\\Desktop\\WindowMetrics'
};

/**
 * Execute a registry command
 * @param {string} command - The reg.exe command to execute
 * @returns {Promise<Object>} Result of the command execution
 */
async function executeRegCommand(command) {
    try {
        const { stdout, stderr } = await execAsync(command);
        if (stderr) {
            console.error('Registry command error:', stderr);
            return { success: false, error: stderr };
        }
        return { success: true, output: stdout };
    } catch (error) {
        console.error('Failed to execute registry command:', error);
        return { success: false, error: error.message };
    }
}

// ===================================================
// MAIN FUNCTIONALITY
// ===================================================

/**
 * Get the current state of Windows tweaks by reading registry values
 * @returns {Promise<Object>} Current tweak settings
 */
async function getCurrentTweaks() {
    try {
        console.log('Getting current tweaks state from registry and defaults');
        
        // Initialize with default values
        let tweaksState = {
            visualfx: 3,
            show_hidden_files: 2,
            file_extensions: 1,
            disable_telemetry: 1,
            disable_advertising_id: 1,
            show_this_pc_on_desktop: 1,
            show_recycle_bin_on_desktop: 0,
            disable_lock_screen: 0,
            disable_cortana: 1,
            small_taskbar_buttons: 0,
            show_seconds_on_taskbar_clock: 0,
            disable_startup_sound: 0,
            disable_animations: 1
        };

        // Query registry for current values
        try {
            // For each registry value, we'll try to read it
            // If it doesn't exist, we'll use the default value

            // Visual Effects (2 = Performance, 3 = Appearance)
            const visualFxVal = await readRegistryValue(REG_PATHS.VISUAL_EFFECTS, 'VisualFXSetting');
            if (visualFxVal !== null) {
                tweaksState.visualfx = parseInt(visualFxVal) || tweaksState.visualfx;
            }

            // Show Hidden Files (1 = Show, 2 = Hide)
            const hiddenFilesVal = await readRegistryValue(REG_PATHS.FILE_EXPLORER, 'Hidden');
            if (hiddenFilesVal !== null) {
                tweaksState.show_hidden_files = parseInt(hiddenFilesVal) || tweaksState.show_hidden_files;
            }

            // Show File Extensions (0 = Show, 1 = Hide)
            const fileExtVal = await readRegistryValue(REG_PATHS.FILE_EXPLORER, 'HideFileExt');
            if (fileExtVal !== null) {
                tweaksState.file_extensions = parseInt(fileExtVal) || tweaksState.file_extensions;
            }

            // Disable Telemetry (1 = Disabled, 0 = Enabled)
            const telemetryVal = await readRegistryValue(REG_PATHS.TELEMETRY, 'AllowTelemetry');
            if (telemetryVal !== null) {
                tweaksState.disable_telemetry = parseInt(telemetryVal) || tweaksState.disable_telemetry;
            }

            // Disable Advertising ID (1 = Disabled, 0 = Enabled)
            const adIdVal = await readRegistryValue(REG_PATHS.ADVERTISING_ID, 'Enabled');
            if (adIdVal !== null) {
                // Invert the value since our UI uses 1 for disabled, but registry uses 0
                tweaksState.disable_advertising_id = adIdVal === '0' ? 1 : 0;
            }

            // Show This PC on Desktop (1 = Show, 0 = Hide)
            const showPcVal = await readRegistryValue(REG_PATHS.DESKTOP_ICONS, '{20D04FE0-3AEA-1069-A2D8-08002B30309D}');
            if (showPcVal !== null) {
                tweaksState.show_this_pc_on_desktop = showPcVal === '0' ? 1 : 0;
            }

            // Show Recycle Bin on Desktop (1 = Show, 0 = Hide)
            const showBinVal = await readRegistryValue(REG_PATHS.DESKTOP_ICONS, '{645FF040-5081-101B-9F08-00AA002F954E}');
            if (showBinVal !== null) {
                tweaksState.show_recycle_bin_on_desktop = showBinVal === '0' ? 1 : 0;
            }

            // Disable Lock Screen (1 = Disabled, 0 = Enabled)
            const lockScreenVal = await readRegistryValue(REG_PATHS.LOCK_SCREEN, 'NoLockScreen');
            if (lockScreenVal !== null) {
                tweaksState.disable_lock_screen = parseInt(lockScreenVal) || tweaksState.disable_lock_screen;
            }

            // Disable Cortana (1 = Disabled, 0 = Enabled)
            const cortanaVal = await readRegistryValue(REG_PATHS.CORTANA, 'AllowCortana');
            if (cortanaVal !== null) {
                // Invert the value since our UI uses 1 for disabled, but registry uses 0
                tweaksState.disable_cortana = cortanaVal === '0' ? 1 : 0;
            }

            // Small Taskbar Buttons (1 = Small, 0 = Normal)
            const taskbarVal = await readRegistryValue(REG_PATHS.TASKBAR, 'TaskbarSmallIcons');
            if (taskbarVal !== null) {
                tweaksState.small_taskbar_buttons = parseInt(taskbarVal) || tweaksState.small_taskbar_buttons;
            }

            // Show Seconds on Taskbar Clock (1 = Show, 0 = Hide)
            const clockVal = await readRegistryValue(REG_PATHS.CLOCK, 'ShowSecondsInSystemClock');
            if (clockVal !== null) {
                tweaksState.show_seconds_on_taskbar_clock = parseInt(clockVal) || tweaksState.show_seconds_on_taskbar_clock;
            }

            // Disable Startup Sound (1 = Disabled, 0 = Enabled)
            const startupSoundVal = await readRegistryValue(REG_PATHS.STARTUP_SOUND, 'DisableStartupSound');
            if (startupSoundVal !== null) {
                tweaksState.disable_startup_sound = parseInt(startupSoundVal) || tweaksState.disable_startup_sound;
            }

            // Disable Animations (2 = Disabled, 1 = Enabled)
            const animationsVal = await readRegistryValue(REG_PATHS.ANIMATIONS, 'MinAnimate');
            if (animationsVal !== null) {
                tweaksState.disable_animations = parseInt(animationsVal) || tweaksState.disable_animations;
            }

        } catch (error) {
            console.error('Error reading registry values:', error);
            // Continue with default values if registry read fails
        }

        return tweaksState;
    } catch (error) {
        console.error('Error getting current tweaks:', error);
        return {};
    }
}

/**
 * Apply Windows tweaks by modifying registry values
 * @param {Object} tweaks - Object containing tweak settings to apply
 * @returns {Promise<Object>} Result of applying tweaks
 */
async function applyTweaks(tweaks) {
    try {
        console.log('Applying tweaks:', tweaks);
        const results = {};
        const errors = [];

        for (const [key, value] of Object.entries(tweaks)) {
            try {
                let regCommand = '';
                let success = false;

                switch (key) {
                    case 'visualfx':
                        regCommand = `reg add "${REG_PATHS.VISUAL_EFFECTS}" /v VisualFXSetting /t REG_DWORD /d ${value} /f`;
                        success = (await executeRegCommand(regCommand)).success;
                        // Also update animation settings
                        if (success) {
                            regCommand = `reg add "${REG_PATHS.ANIMATIONS}" /v MinAnimate /t REG_SZ /d ${value === 2 ? "0" : "1"} /f`;
                            success = (await executeRegCommand(regCommand)).success;
                        }
                        break;

                    case 'show_hidden_files':
                        regCommand = `reg add "${REG_PATHS.FILE_EXPLORER}" /v Hidden /t REG_DWORD /d ${value} /f`;
                        success = (await executeRegCommand(regCommand)).success;
                        break;

                    case 'file_extensions':
                        regCommand = `reg add "${REG_PATHS.FILE_EXPLORER}" /v HideFileExt /t REG_DWORD /d ${value} /f`;
                        success = (await executeRegCommand(regCommand)).success;
                        break;

                    case 'disable_telemetry':
                        regCommand = `reg add "${REG_PATHS.TELEMETRY}" /v AllowTelemetry /t REG_DWORD /d ${value} /f`;
                        success = (await executeRegCommand(regCommand)).success;
                        break;

                    case 'disable_advertising_id':
                        regCommand = `reg add "${REG_PATHS.ADVERTISING_ID}" /v Enabled /t REG_DWORD /d ${value === 1 ? 0 : 1} /f`;
                        success = (await executeRegCommand(regCommand)).success;
                        break;

                    case 'show_this_pc_on_desktop':
                        regCommand = `reg add "${REG_PATHS.DESKTOP_ICONS}" /v "{20D04FE0-3AEA-1069-A2D8-08002B30309D}" /t REG_DWORD /d ${value === 1 ? 0 : 1} /f`;
                        success = (await executeRegCommand(regCommand)).success;
                        break;

                    case 'show_recycle_bin_on_desktop':
                        regCommand = `reg add "${REG_PATHS.DESKTOP_ICONS}" /v "{645FF040-5081-101B-9F08-00AA002F954E}" /t REG_DWORD /d ${value === 1 ? 0 : 1} /f`;
                        success = (await executeRegCommand(regCommand)).success;
                        break;

                    case 'disable_lock_screen':
                        regCommand = `reg add "${REG_PATHS.LOCK_SCREEN}" /v NoLockScreen /t REG_DWORD /d ${value} /f`;
                        success = (await executeRegCommand(regCommand)).success;
                        break;

                    case 'disable_cortana':
                        regCommand = `reg add "${REG_PATHS.CORTANA}" /v AllowCortana /t REG_DWORD /d ${value === 1 ? 0 : 1} /f`;
                        success = (await executeRegCommand(regCommand)).success;
                        break;

                    case 'small_taskbar_buttons':
                        regCommand = `reg add "${REG_PATHS.TASKBAR}" /v TaskbarSmallIcons /t REG_DWORD /d ${value} /f`;
                        success = (await executeRegCommand(regCommand)).success;
                        break;

                    case 'show_seconds_on_taskbar_clock':
                        regCommand = `reg add "${REG_PATHS.CLOCK}" /v ShowSecondsInSystemClock /t REG_DWORD /d ${value} /f`;
                        success = (await executeRegCommand(regCommand)).success;
                        break;

                    case 'disable_startup_sound':
                        regCommand = `reg add "${REG_PATHS.STARTUP_SOUND}" /v DisableStartupSound /t REG_DWORD /d ${value} /f`;
                        success = (await executeRegCommand(regCommand)).success;
                        break;

                    default:
                        console.warn(`Unknown tweak: ${key}`);
                        continue;
                }

                results[key] = success;
                if (!success) errors.push(`Failed to apply ${key}`);

            } catch (error) {
                console.error(`Error applying tweak ${key}:`, error);
                errors.push(error.message);
            }
        }

        // Refresh explorer if needed
        if (Object.keys(tweaks).some(key => ['show_hidden_files', 'file_extensions', 'show_this_pc_on_desktop', 'show_recycle_bin_on_desktop'].includes(key))) {
            await executeRegCommand('taskkill /f /im explorer.exe && start explorer.exe');
        }

        return { success: errors.length === 0, results, errors };
    } catch (error) {
        console.error('Error applying tweaks:', error);
        return { success: false, error: error.message };
    }
}

// ===================================================
// GAME MODE FUNCTIONS
// ===================================================

/**
 * Set Windows Game Mode
 * @param {boolean} enabled - Whether to enable or disable Game Mode
 * @returns {Promise<Object>} Result of setting Game Mode
 */
async function setGameMode(enabled) {
    try {
        console.log(`Setting Game Mode to: ${enabled ? 'enabled' : 'disabled'}`);
        
        // In a real implementation, this would modify the registry
        // For now, we'll just simulate success
        
        return { success: true, enabled };
    } catch (error) {
        console.error('Error setting Game Mode:', error);
        return { error: error.message };
    }
}

/**
 * Get the current status of Windows Game Mode
 * @returns {Promise<boolean>} Whether Game Mode is enabled
 */
async function getGameModeStatus() {
    try {
        // In a real implementation, this would read the registry
        // For now, we'll return a default value
        return false;
    } catch (error) {
        console.error('Error getting Game Mode status:', error);
        return false;
    }
}

// ===================================================
// EXPORTS
// ===================================================

module.exports = {
    getCurrentTweaks,
    applyTweaks,
    setGameMode,
    getGameModeStatus
};
