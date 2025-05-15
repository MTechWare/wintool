/**
 * WinTool - Tweaks Module
 * Handles Windows registry tweaks and system optimizations
 *
 * This module provides functions for reading and modifying Windows registry settings
 * to customize system behavior, appearance, and performance.
 */

// ===================================================
// IMPORTS
// ===================================================
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const REG_PATHS = require('./registry-paths');
const { readRegistryValue } = require('./registry-utils');

// ===================================================
// CONSTANTS
// ===================================================
const REGISTRY_COMMAND_TIMEOUT = 10000; // 10 seconds timeout for registry commands

/**
 * Execute a registry command with error handling
 * @param {string} command - The reg.exe command to execute
 * @param {number} [customTimeout] - Optional custom timeout in milliseconds
 * @returns {Promise<{success: boolean, output?: string, error?: string}>} Result of the command execution
 */
async function executeRegCommand(command, customTimeout) {
    try {
        // Use custom timeout if provided, otherwise use default
        const timeout = customTimeout || REGISTRY_COMMAND_TIMEOUT;
        console.log(`Executing registry command with timeout: ${timeout}ms`);

        const { stdout, stderr } = await execAsync(command, { timeout });
        if (stderr && stderr.trim() !== '') {
            console.error('Registry command error:', stderr);
            return { success: false, error: stderr };
        }
        return { success: true, output: stdout };
    } catch (error) {
        console.error('Failed to execute registry command:', error);

        // Check if this is a timeout error
        if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
            console.warn('Registry command timed out, this may be normal for some visual tweaks');
            // For timeouts on visual tweaks, we'll consider it a success since Windows might
            // still be applying the changes even after the timeout
            return {
                success: true,
                output: 'Command timed out but may have succeeded',
                warning: 'Operation timed out, but this is sometimes normal for visual tweaks'
            };
        }

        return { success: false, error: error.message };
    }
}

// Note: readRegistryValue is now imported from registry-utils.js

// ===================================================
// MAIN FUNCTIONALITY
// ===================================================

/**
 * Default tweak settings to use when registry values are not available
 */
const DEFAULT_TWEAKS = {
    visualfx: 3,                       // Visual effects (3 = Appearance, 2 = Performance)
    show_hidden_files: 2,              // Hidden files (1 = Show, 2 = Hide)
    file_extensions: 1,                // File extensions (0 = Show, 1 = Hide)
    disable_telemetry: 1,              // Telemetry (0 = Disabled, 1 = Enabled)
    disable_advertising_id: 0,         // Advertising ID (1 = Disabled, 0 = Enabled)
    show_this_pc_on_desktop: 0,        // This PC icon (1 = Show, 0 = Hide)
    show_recycle_bin_on_desktop: 0,    // Recycle Bin icon (1 = Show, 0 = Hide)
    disable_lock_screen: 0,            // Lock screen (1 = Disabled, 0 = Enabled)
    disable_cortana: 0,                // Cortana (1 = Disabled, 0 = Enabled)
    small_taskbar_buttons: 0,          // Taskbar buttons (1 = Small, 0 = Normal)
    show_seconds_on_taskbar_clock: 0,  // Taskbar clock seconds (1 = Show, 0 = Hide)
    disable_startup_sound: 0,          // Startup sound (1 = Disabled, 0 = Enabled)
    disable_animations: 1,             // Animations (1 = Disabled, 2 = Enabled)
    uac_level: 2,                      // UAC level (0-3, 2 = Default)
    disable_notifications: 0,          // Notifications (1 = Disabled, 0 = Enabled)
    disable_startup_delay: 0,          // Startup delay (1 = Disabled, 0 = Enabled)
    disable_search_web: 0,             // Web search (1 = Disabled, 0 = Enabled)
    disable_suggestions: 0,            // Suggestions (1 = Disabled, 0 = Enabled)
    power_plan: 'balanced'             // Power plan (balanced, high, power-saver)
};

/**
 * Get the current state of Windows tweaks by reading registry values
 * @returns {Promise<Object>} Current tweak settings
 */
async function getCurrentTweaks() {
    try {
        console.log('Getting current tweaks state from registry and defaults');

        // Start with default values
        const tweaksState = { ...DEFAULT_TWEAKS };

        // Registry value mappings with their paths and names
        const registryMappings = [
            { key: 'visualfx', path: REG_PATHS.VISUAL_EFFECTS.SETTINGS, name: 'VisualFXSetting', parser: parseInt },
            { key: 'show_hidden_files', path: REG_PATHS.EXPLORER.ADVANCED, name: 'Hidden', parser: parseInt },
            { key: 'file_extensions', path: REG_PATHS.EXPLORER.ADVANCED, name: 'HideFileExt', parser: parseInt },
            { key: 'disable_telemetry', path: REG_PATHS.TELEMETRY.BASE, name: 'AllowTelemetry', parser: parseInt },
            {
                key: 'disable_advertising_id',
                path: REG_PATHS.ADVERTISING.ID,
                name: 'Enabled',
                parser: (val) => val === '0' ? 1 : 0
            },
            {
                key: 'show_this_pc_on_desktop',
                path: REG_PATHS.EXPLORER.DESKTOP_ICONS,
                name: '{20D04FE0-3AEA-1069-A2D8-08002B30309D}',
                parser: (val) => val === '0' ? 1 : 0
            },
            {
                key: 'show_recycle_bin_on_desktop',
                path: REG_PATHS.EXPLORER.DESKTOP_ICONS,
                name: '{645FF040-5081-101B-9F08-00AA002F954E}',
                parser: (val) => val === '0' ? 1 : 0
            },
            { key: 'disable_lock_screen', path: REG_PATHS.LOCK_SCREEN, name: 'NoLockScreen', parser: parseInt },
            {
                key: 'disable_cortana',
                path: REG_PATHS.CORTANA.BASE,
                name: 'AllowCortana',
                parser: (val) => val === '0' ? 1 : 0
            },
            { key: 'small_taskbar_buttons', path: REG_PATHS.EXPLORER.TASKBAR, name: 'TaskbarSmallIcons', parser: parseInt },
            {
                key: 'show_seconds_on_taskbar_clock',
                path: REG_PATHS.EXPLORER.CLOCK,
                name: 'ShowSecondsInSystemClock',
                parser: parseInt
            },
            { key: 'disable_startup_sound', path: REG_PATHS.SOUND.STARTUP, name: 'DisableStartupSound', parser: parseInt },
            { key: 'disable_animations', path: REG_PATHS.VISUAL_EFFECTS.ADVANCED, name: 'MinAnimate', parser: parseInt },
            { key: 'uac_level', path: REG_PATHS.UAC.POLICIES, name: 'ConsentPromptBehaviorAdmin', parser: parseInt },
            {
                key: 'disable_notifications',
                path: REG_PATHS.NOTIFICATIONS,
                name: 'ToastEnabled',
                parser: (val) => val === '0' ? 1 : 0
            }
        ];

        // Query registry for current values
        try {
            // Process each registry mapping
            for (const mapping of registryMappings) {
                const value = await readRegistryValue(mapping.path, mapping.name);
                if (value !== null) {
                    const parsedValue = mapping.parser(value);
                    if (!isNaN(parsedValue) || typeof parsedValue === 'boolean') {
                        tweaksState[mapping.key] = parsedValue;
                    }
                }
            }
        } catch (error) {
            console.error('Error reading registry values:', error);
            // Continue with default values if registry read fails
        }

        return tweaksState;
    } catch (error) {
        console.error('Error getting current tweaks:', error);
        return { ...DEFAULT_TWEAKS };
    }
}

/**
 * Registry tweak mappings for applying tweaks
 */
const REGISTRY_TWEAKS = {
    visualfx: { path: REG_PATHS.VISUAL_EFFECTS.SETTINGS, name: 'VisualFXSetting', type: 'REG_DWORD' },
    show_hidden_files: { path: REG_PATHS.EXPLORER.ADVANCED, name: 'Hidden', type: 'REG_DWORD' },
    file_extensions: { path: REG_PATHS.EXPLORER.ADVANCED, name: 'HideFileExt', type: 'REG_DWORD' },
    disable_telemetry: { path: REG_PATHS.TELEMETRY.BASE, name: 'AllowTelemetry', type: 'REG_DWORD' },
    disable_advertising_id: { path: REG_PATHS.ADVERTISING.ID, name: 'Enabled', type: 'REG_DWORD' },
    show_this_pc_on_desktop: {
        path: REG_PATHS.EXPLORER.DESKTOP_ICONS,
        name: '{20D04FE0-3AEA-1069-A2D8-08002B30309D}',
        type: 'REG_DWORD',
        valueTransform: (value) => value === 1 ? 0 : 1  // Invert: 1 (enabled) → 0 in registry
    },
    show_recycle_bin_on_desktop: {
        path: REG_PATHS.EXPLORER.DESKTOP_ICONS,
        name: '{645FF040-5081-101B-9F08-00AA002F954E}',
        type: 'REG_DWORD',
        valueTransform: (value) => value === 1 ? 0 : 1  // Invert: 1 (enabled) → 0 in registry
    },
    disable_lock_screen: { path: REG_PATHS.LOCK_SCREEN, name: 'NoLockScreen', type: 'REG_DWORD' },
    disable_cortana: { path: REG_PATHS.CORTANA.BASE, name: 'AllowCortana', type: 'REG_DWORD' },
    small_taskbar_buttons: { path: REG_PATHS.EXPLORER.TASKBAR, name: 'TaskbarSmallIcons', type: 'REG_DWORD' },
    show_seconds_on_taskbar_clock: {
        path: REG_PATHS.EXPLORER.CLOCK,
        name: 'ShowSecondsInSystemClock',
        type: 'REG_DWORD'
    },
    disable_startup_sound: { path: REG_PATHS.SOUND.STARTUP, name: 'DisableStartupSound', type: 'REG_DWORD' },
    disable_animations: {
        path: REG_PATHS.VISUAL_EFFECTS.ADVANCED,
        name: 'MinAnimate',
        type: 'REG_DWORD',
        valueTransform: (value) => value === 1 ? 1 : 2
    },
    disable_notifications: {
        path: REG_PATHS.NOTIFICATIONS,
        name: 'ToastEnabled',
        type: 'REG_DWORD',
        valueTransform: (value) => value === 1 ? 0 : 1
    }
};

/**
 * Tweaks that require explorer.exe to be restarted when changed
 */
const EXPLORER_RESTART_TWEAKS = [
    'show_hidden_files',
    'file_extensions',
    'show_this_pc_on_desktop',
    'show_recycle_bin_on_desktop'
];

/**
 * Apply Windows tweaks by modifying registry values
 * @param {Object} tweaks - Object containing tweak settings to apply
 * @returns {Promise<{success: boolean, results: Object, errors: string[]}>} Result of applying tweaks
 */
async function applyTweaks(tweaks) {
    try {
        console.log('Applying tweaks:', tweaks);
        const results = {};
        const errors = [];

        // Check if we're applying visual effects tweaks that might cause screen flicker
        const hasVisualTweaks = Object.keys(tweaks).some(key =>
            key === 'visualfx' ||
            key === 'disable_animations' ||
            key.includes('visual') ||
            key.includes('animation')
        );

        // If we have visual tweaks, apply them separately and with a delay
        if (hasVisualTweaks) {
            console.log('Visual tweaks detected, applying with special handling');

            // First apply all non-visual tweaks
            const nonVisualTweaks = {};
            const visualTweaks = {};

            for (const [key, value] of Object.entries(tweaks)) {
                if (key === 'visualfx' || key === 'disable_animations' || key.includes('visual') || key.includes('animation')) {
                    visualTweaks[key] = value;
                } else {
                    nonVisualTweaks[key] = value;
                }
            }

            // Apply non-visual tweaks first
            for (const [key, value] of Object.entries(nonVisualTweaks)) {
                try {
                    const result = await applyTweak(key, value);
                    results[key] = result.success;
                    if (!result.success) {
                        errors.push(`Failed to apply ${key}: ${result.error}`);
                    }
                } catch (error) {
                    console.error(`Error applying tweak ${key}:`, error);
                    errors.push(error.message);
                }
            }

            // Then apply visual tweaks one by one with a delay
            for (const [key, value] of Object.entries(visualTweaks)) {
                try {
                    console.log(`Applying visual tweak: ${key} with value: ${value}`);
                    // Add a delay before applying visual tweaks to prevent screen blackouts
                    await new Promise(resolve => setTimeout(resolve, 500));

                    const result = await applyTweak(key, value);
                    results[key] = result.success;
                    if (!result.success) {
                        errors.push(`Failed to apply ${key}: ${result.error}`);
                    }

                    // Add a delay after applying visual tweaks to let the system stabilize
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    console.error(`Error applying visual tweak ${key}:`, error);
                    errors.push(error.message);
                }
            }
        } else {
            // Apply each tweak normally if no visual tweaks
            for (const [key, value] of Object.entries(tweaks)) {
                try {
                    const result = await applyTweak(key, value);
                    results[key] = result.success;
                    if (!result.success) {
                        errors.push(`Failed to apply ${key}: ${result.error}`);
                    }
                } catch (error) {
                    console.error(`Error applying tweak ${key}:`, error);
                    errors.push(error.message);
                }
            }
        }

        // Refresh explorer if needed
        const needsExplorerRestart = Object.keys(tweaks).some(key => EXPLORER_RESTART_TWEAKS.includes(key));
        if (needsExplorerRestart) {
            try {
                await execAsync('taskkill /f /im explorer.exe && start explorer.exe', { timeout: 5000 });
            } catch (error) {
                console.error('Error restarting explorer:', error);
                // Non-critical error, don't add to errors array
            }
        }

        return {
            success: errors.length === 0,
            results,
            errors
        };
    } catch (error) {
        console.error('Error applying tweaks:', error);
        return {
            success: false,
            results: {},
            errors: [error.message],
            error: error.message
        };
    }
}

/**
 * Apply a single tweak to the system
 * @param {string} key - The tweak key
 * @param {number|string} value - The value to set
 * @returns {Promise<{success: boolean, error: string|null}>} - Result of the operation
 */
async function applyTweak(key, value) {
    console.log(`Applying tweak: ${key} with value: ${value}`);

    try {
        // Convert string numbers to integers
        if (typeof value === 'string' && !isNaN(value)) {
            value = parseInt(value);
        }

        // Check if the tweak exists in our registry mappings
        const tweakConfig = REGISTRY_TWEAKS[key];
        if (!tweakConfig) {
            throw new Error(`Unknown tweak: ${key}`);
        }

        // Get registry path, name, and type
        const { path: regPath, name: regName, type: regType } = tweakConfig;

        // Apply value transformation if specified
        let regValue = value;
        if (tweakConfig.valueTransform) {
            regValue = tweakConfig.valueTransform(value);
        }

        // Special handling for visual effects tweaks
        if (key === 'visualfx') {
            console.log(`Applying visual effects tweak with value: ${regValue}`);

            // Save the current value before changing it (for recovery if needed)
            try {
                const currentValue = await readRegistryValue(regPath, regName);
                console.log(`Current visual effects value: ${currentValue}`);
            } catch (readError) {
                console.warn(`Could not read current visual effects value: ${readError.message}`);
            }

            // Execute registry command with a longer timeout for visual effects
            const command = `reg add "${regPath}" /v ${regName} /t ${regType} /d ${regValue} /f`;
            const result = await executeRegCommand(command, 20000); // 20 second timeout

            return {
                success: result.success,
                error: result.error || null
            };
        }
        // Special handling for animation tweaks
        else if (key === 'disable_animations') {
            console.log(`Applying animation tweak with value: ${regValue}`);

            // Execute registry command with a longer timeout for animations
            const command = `reg add "${regPath}" /v ${regName} /t ${regType} /d ${regValue} /f`;
            const result = await executeRegCommand(command, 15000); // 15 second timeout

            return {
                success: result.success,
                error: result.error || null
            };
        }
        // Normal handling for other tweaks
        else {
            // Execute registry command
            const command = `reg add "${regPath}" /v ${regName} /t ${regType} /d ${regValue} /f`;
            const result = await executeRegCommand(command);

            return {
                success: result.success,
                error: result.error || null
            };
        }
    } catch (error) {
        console.error(`Error applying tweak ${key}:`, error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Tweak value mappings for UI state
 */
const TWEAK_UI_MAPPINGS = {
    // For these tweaks, 0 means enabled (shown/disabled), 1 means disabled (hidden/enabled)
    file_extensions: { enabledValue: 0 },
    disable_telemetry: { enabledValue: 0 },
    disable_advertising_id: { enabledValue: 0 },
    disable_cortana: { enabledValue: 0 },
    disable_notifications: { enabledValue: 0 },
    show_this_pc_on_desktop: { enabledValue: 0 },
    show_recycle_bin_on_desktop: { enabledValue: 0 },

    // For animations, 2 means enabled, 1 means disabled
    disable_animations: { enabledValue: 2 },

    // For standard tweaks, 1 means enabled, 0 means disabled (default)
};

// Note: The UI-related functions below are provided for reference
// and should be implemented in the renderer process.
// They are exported to help the renderer process handle tweak changes.

/**
 * Determine if a tweak is enabled based on its registry value
 * @param {string} key - The tweak key
 * @param {number|string} value - The registry value
 * @returns {boolean} Whether the tweak is enabled
 */
function isTweakEnabled(key, value) {
    const mapping = TWEAK_UI_MAPPINGS[key];
    if (mapping && mapping.enabledValue !== undefined) {
        return value === mapping.enabledValue;
    }
    // Default: 1 means enabled, 0 means disabled
    return value === 1;
}

/**
 * Get the registry value to send for a tweak based on UI state
 * @param {string} key - The tweak key
 * @param {boolean} enabled - Whether the tweak should be enabled
 * @returns {number} The registry value to send
 */
function getTweakValueForState(key, enabled) {
    const mapping = TWEAK_UI_MAPPINGS[key];
    if (mapping && mapping.enabledValue !== undefined) {
        return enabled ? mapping.enabledValue : (mapping.enabledValue === 0 ? 1 : 0);
    }
    // Default: 1 means enabled, 0 means disabled
    return enabled ? 1 : 0;
}

// ===================================================
// GAME MODE FUNCTIONS
// ===================================================

/**
 * Set Windows Game Mode
 * @param {boolean} enabled - Whether to enable or disable Game Mode
 * @returns {Promise<{success: boolean, enabled: boolean, error?: string}>} Result of setting Game Mode
 */
async function setGameMode(enabled) {
    try {
        console.log(`Setting Game Mode to: ${enabled ? 'enabled' : 'disabled'}`);

        const regCommand = `reg add "${REG_PATHS.GAMING.GAME_BAR}" /v AutoGameModeEnabled /t REG_DWORD /d ${enabled ? 1 : 0} /f`;
        const result = await executeRegCommand(regCommand);

        return { success: result.success, enabled };
    } catch (error) {
        console.error('Error setting Game Mode:', error);
        return { success: false, enabled: false, error: error.message };
    }
}

/**
 * Get the current status of Windows Game Mode
 * @returns {Promise<boolean>} Whether Game Mode is enabled
 */
async function getGameModeStatus() {
    try {
        const gameModeVal = await readRegistryValue(REG_PATHS.GAMING.GAME_BAR, 'AutoGameModeEnabled');
        return gameModeVal === '0x1';
    } catch (error) {
        console.error('Error getting Game Mode status:', error);
        return false;
    }
}

// ===================================================
// EXPORTS
// ===================================================

module.exports = {
    // Main tweak functions
    getCurrentTweaks,
    applyTweaks,

    // Game mode functions
    setGameMode,
    getGameModeStatus,

    // Helper functions for renderer process
    isTweakEnabled,
    getTweakValueForState
};
