/**
 * WinTool - Tweaks Module
 * Handles Windows registry tweaks and system optimizations
 */

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

// Check Windows version
const isWindows11 = () => {
    const release = os.release().split('.');
    return parseInt(release[0]) >= 10 && parseInt(release[2]) >= 22000;
};

// Registry paths that are common to both Windows 10 and 11
const REG_PATHS = {
    VISUAL_EFFECTS: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects',
    FILE_EXPLORER: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced',
    DESKTOP_ICONS: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\HideDesktopIcons\\NewStartPanel',
    TELEMETRY: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Privacy',
    ADVERTISING_ID: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo',
    LOCK_SCREEN: 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Personalization',
    CORTANA: isWindows11() ? 
        'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search' : 
        'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search',
    TASKBAR: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced',
    CLOCK: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced',
    STARTUP_SOUND: 'HKCU\\AppEvents\\Schemes\\Apps\\.Default\\SystemStart\\.Current',
    ANIMATIONS: 'HKCU\\Control Panel\\Desktop'
};

/**
 * Execute a registry command
 * @param {string} command - The reg.exe command to execute
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

/**
 * Get the current state of Windows tweaks by reading registry values
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
                console.log('Read file_extensions value:', fileExtVal, 'parsed as:', tweaksState.file_extensions);
            }

            // Disable Telemetry - Use a user-level setting that doesn't require admin
            const telemetryVal = await readRegistryValue(REG_PATHS.TELEMETRY, 'TailoredExperiencesWithDiagnosticDataEnabled');
            if (telemetryVal !== null) {
                // Invert the value since our UI uses disable_telemetry
                tweaksState.disable_telemetry = telemetryVal === '0' ? 0 : 1;
                console.log('Read telemetry value:', telemetryVal, 'set disable_telemetry to:', tweaksState.disable_telemetry);
            }

            // Disable Advertising ID - Make sure we're reading the right value
            const adIdVal = await readRegistryValue(REG_PATHS.ADVERTISING_ID, 'Enabled');
            if (adIdVal !== null) {
                tweaksState.disable_advertising_id = adIdVal === '0' ? 0 : 1;
                console.log('Read advertising_id value:', adIdVal, 'set disable_advertising_id to:', tweaksState.disable_advertising_id);
            }

            // Show This PC on Desktop (0 = Show, 1 = Hide)
            const thisPcVal = await readRegistryValue(REG_PATHS.DESKTOP_ICONS, '{20D04FE0-3AEA-1069-A2D8-08002B30309D}');
            if (thisPcVal !== null) {
                tweaksState.show_this_pc_on_desktop = parseInt(thisPcVal) || tweaksState.show_this_pc_on_desktop;
            }

            // Show Recycle Bin on Desktop (0 = Show, 1 = Hide)
            const recycleBinVal = await readRegistryValue(REG_PATHS.DESKTOP_ICONS, '{645FF040-5081-101B-9F08-00AA002F954E}');
            if (recycleBinVal !== null) {
                tweaksState.show_recycle_bin_on_desktop = parseInt(recycleBinVal) || tweaksState.show_recycle_bin_on_desktop;
            }

            // Disable Lock Screen (1 = Disabled, 0 = Enabled)
            const lockScreenVal = await readRegistryValue(REG_PATHS.LOCK_SCREEN, 'NoLockScreen');
            if (lockScreenVal !== null) {
                tweaksState.disable_lock_screen = parseInt(lockScreenVal) || tweaksState.disable_lock_screen;
            }

            // Disable Cortana (0 = Disabled, 1 = Enabled)
            const cortanaVal = await readRegistryValue(REG_PATHS.CORTANA, 'AllowCortana');
            if (cortanaVal !== null) {
                tweaksState.disable_cortana = parseInt(cortanaVal) || tweaksState.disable_cortana;
            }

            // Small Taskbar Buttons (1 = Small, 0 = Normal)
            const smallTaskbarVal = await readRegistryValue(REG_PATHS.TASKBAR, 'SmallIcons');
            if (smallTaskbarVal !== null) {
                tweaksState.small_taskbar_buttons = parseInt(smallTaskbarVal) || tweaksState.small_taskbar_buttons;
            }

            // Show Seconds on Taskbar Clock (1 = Show, 0 = Hide)
            const showSecondsVal = await readRegistryValue(REG_PATHS.CLOCK, 'ShowSecondsInSystemClock');
            if (showSecondsVal !== null) {
                tweaksState.show_seconds_on_taskbar_clock = parseInt(showSecondsVal) || tweaksState.show_seconds_on_taskbar_clock;
            }

            // Disable Startup Sound (empty string = Disabled, non-empty = Enabled)
            const startupSoundVal = await readRegistryValue(REG_PATHS.STARTUP_SOUND, '');
            if (startupSoundVal !== null) {
                tweaksState.disable_startup_sound = startupSoundVal.trim() === '' ? 1 : 0;
            }

            // Disable Animations (UserPreferencesMask byte 3, bit 1)
            const animationsVal = await readRegistryValue(REG_PATHS.ANIMATIONS, 'UserPreferencesMask');
            if (animationsVal !== null && typeof animationsVal === 'string') {
                const hex = animationsVal.replace(/\s+/g, '');
                if (hex.length >= 8) {
                    // Get 3rd byte (index 4-5)
                    const byte3 = parseInt(hex.substr(4, 2), 16);
                    tweaksState.disable_animations = (byte3 & 0x02) ? 2 : 1;
                }
            }
        } catch (regError) {
            console.error('Error reading registry values:', regError);
            // Continue with defaults if registry reads fail
        }

        console.log('Final tweaks state:', tweaksState);
        return tweaksState;
    } catch (error) {
        console.error('Error getting current tweaks:', error);
        return { error: error.message };
    }
}

/**
 * Apply Windows tweaks by modifying registry values
 * @param {Object} tweaks - Object containing tweak settings to apply
 */
async function applyTweaks(tweaks) {
    try {
        console.log('Applying tweaks:', tweaks);
        
        // No reading from tweaks.json, just use tweaks param
        const newState = { ...tweaks };
        
        // Apply registry changes for each tweak
        const errors = [];
        const results = {};
        
        for (const [key, value] of Object.entries(tweaks)) {
            let regCommand = '';
            let success = false;
            
            switch (key) {
                case 'visualfx':
                    // Visual Effects (2 = Performance, 3 = Appearance)
                    regCommand = `reg add "${REG_PATHS.VISUAL_EFFECTS}" /v VisualFXSetting /t REG_DWORD /d ${value} /f`;
                    success = (await executeRegCommand(regCommand)).success;
                    break;
                    
                case 'show_hidden_files':
                    // Show Hidden Files (1 = Show, 2 = Hide)
                    regCommand = `reg add "${REG_PATHS.FILE_EXPLORER}" /v Hidden /t REG_DWORD /d ${value} /f`;
                    success = (await executeRegCommand(regCommand)).success;
                    break;
                    
                case 'file_extensions':
                    // Show File Extensions (0 = Show, 1 = Hide)
                    regCommand = `reg add "${REG_PATHS.FILE_EXPLORER}" /v HideFileExt /t REG_DWORD /d ${value} /f`;
                    success = (await executeRegCommand(regCommand)).success;
                    console.log(`Applied file_extensions: ${value}, success: ${success}`);
                    break;
                    
                case 'disable_telemetry':
                    // Disable Telemetry - Use a user-level setting that doesn't require admin
                    // TailoredExperiencesWithDiagnosticDataEnabled (0 = Disabled, 1 = Enabled)
                    regCommand = `reg add "${REG_PATHS.TELEMETRY}" /v TailoredExperiencesWithDiagnosticDataEnabled /t REG_DWORD /d ${value} /f`;
                    success = (await executeRegCommand(regCommand)).success;
                    console.log(`Applied disable_telemetry: ${value}, success: ${success}`);
                    break;
                    
                case 'disable_advertising_id':
                    // Disable Advertising ID (0 = Disabled, 1 = Enabled)
                    regCommand = `reg add "${REG_PATHS.ADVERTISING_ID}" /v Enabled /t REG_DWORD /d ${value} /f`;
                    success = (await executeRegCommand(regCommand)).success;
                    console.log(`Applied disable_advertising_id: ${value}, success: ${success}`);
                    break;
                    
                case 'show_this_pc_on_desktop':
                    // Show This PC on Desktop (0 = Show, 1 = Hide)
                    regCommand = `reg add "${REG_PATHS.DESKTOP_ICONS}" /v "{20D04FE0-3AEA-1069-A2D8-08002B30309D}" /t REG_DWORD /d ${value} /f`;
                    success = (await executeRegCommand(regCommand)).success;
                    break;
                    
                case 'show_recycle_bin_on_desktop':
                    // Show Recycle Bin on Desktop (0 = Show, 1 = Hide)
                    regCommand = `reg add "${REG_PATHS.DESKTOP_ICONS}" /v "{645FF040-5081-101B-9F08-00AA002F954E}" /t REG_DWORD /d ${value} /f`;
                    success = (await executeRegCommand(regCommand)).success;
                    break;
                    
                case 'disable_lock_screen':
                    // Disable Lock Screen (1 = Disabled, 0 = Enabled)
                    regCommand = `reg add "${REG_PATHS.LOCK_SCREEN}" /v NoLockScreen /t REG_DWORD /d ${value} /f`;
                    success = (await executeRegCommand(regCommand)).success;
                    break;
                    
                case 'disable_cortana':
                    // Disable Cortana (0 = Disabled, 1 = Enabled)
                    regCommand = `reg add "${REG_PATHS.CORTANA}" /v AllowCortana /t REG_DWORD /d ${value} /f`;
                    success = (await executeRegCommand(regCommand)).success;
                    break;
                    
                case 'small_taskbar_buttons':
                    // Small Taskbar Buttons (1 = Small, 0 = Normal)
                    regCommand = `reg add "${REG_PATHS.TASKBAR}" /v SmallIcons /t REG_DWORD /d ${value} /f`;
                    success = (await executeRegCommand(regCommand)).success;
                    break;
                    
                case 'show_seconds_on_taskbar_clock':
                    // Show Seconds on Taskbar Clock (1 = Show, 0 = Hide)
                    regCommand = `reg add "${REG_PATHS.CLOCK}" /v ShowSecondsInSystemClock /t REG_DWORD /d ${value} /f`;
                    success = (await executeRegCommand(regCommand)).success;
                    break;
                    
                case 'disable_startup_sound':
                    // Disable Startup Sound (1 = Disabled, 0 = Enabled)
                    if (value === 1) {
                        regCommand = `reg add "${REG_PATHS.STARTUP_SOUND}" /ve /t REG_SZ /d "" /f`;
                    } else {
                        regCommand = `reg add "${REG_PATHS.STARTUP_SOUND}" /ve /t REG_SZ /d "Windows Startup.wav" /f`;
                    }
                    success = (await executeRegCommand(regCommand)).success;
                    break;
                    
                case 'disable_animations':
                    // Disable Animations (2 = Disabled, 1 = Enabled)
                    if (value === 2) {
                        regCommand = `reg add "${REG_PATHS.ANIMATIONS}" /v UserPreferencesMask /t REG_BINARY /d 9012078010000000 /f`;
                    } else {
                        regCommand = `reg add "${REG_PATHS.ANIMATIONS}" /v UserPreferencesMask /t REG_BINARY /d 9E3E078010000000 /f`;
                    }
                    success = (await executeRegCommand(regCommand)).success;
                    break;
                    
                default:
                    console.warn(`Unknown tweak key: ${key}`);
                    continue;
            }
            
            // Store result for this tweak
            results[key] = success;
            
            // If there was an error, add it to the errors array
            if (!success) {
                errors.push(`Failed to apply ${key}`);
            }
        }
        
        return { 
            success: errors.length === 0,
            errors: errors,
            results: results,
            tweaks: newState
        };
    } catch (error) {
        console.error('Error applying tweaks:', error);
        return { 
            success: false, 
            errors: [error.message],
            tweaks: {}
        };
    }
}

/**
 * Set Windows Game Mode
 * @param {boolean} enabled - Whether to enable or disable Game Mode
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

module.exports = {
    getCurrentTweaks,
    applyTweaks,
    setGameMode,
    getGameModeStatus
};
