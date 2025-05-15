/**
 * WinTool - Gaming Features Module
 * Provides functions for optimizing Windows for gaming
 *
 * This module contains functions for enhancing gaming performance by adjusting
 * system settings, process priorities, and Windows gaming features.
 */

// ===================================================
// IMPORTS
// ===================================================
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const REG_PATHS = require('./registry-paths');
const { readRegistryValue, writeRegistryValue } = require('./registry-utils');

// ===================================================
// CONSTANTS
// ===================================================
/**
 * Power plan GUIDs
 */
const POWER_PLANS = {
    HIGH_PERFORMANCE: '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c',
    BALANCED: '381b4222-f694-41f0-9685-ff5bb260df2e',
    POWER_SAVER: 'a1841308-3541-4fab-bc81-f71556f20b4a'
};

/**
 * System processes that should not have their priority changed
 */
const PROTECTED_PROCESSES = [
    'System',
    'Registry',
    'WinLogon',
    'csrss',
    'smss',
    'wininit',
    'services',
    'lsass',
    'svchost'
];

// ===================================================
// STATE
// ===================================================
/**
 * Track whether game booster is currently active
 */
let gameBoosterActive = false;

// ===================================================
// HELPER FUNCTIONS
// ===================================================
/**
 * Execute a PowerShell command with error handling
 * @param {string} command - The PowerShell command to execute
 * @returns {Promise<{success: boolean, stdout?: string, stderr?: string, error?: string}>} Result of the command execution
 */
async function executePowerShellCommand(command) {
    try {
        const fullCommand = `powershell -Command "${command}"`;
        const { stdout, stderr } = await execAsync(fullCommand);
        return {
            success: true,
            stdout,
            stderr
        };
    } catch (error) {
        console.error(`Error executing PowerShell command:`, error);
        return {
            success: false,
            error: error.message,
            stderr: error.stderr
        };
    }
}

// ===================================================
// MAIN FUNCTIONALITY
// ===================================================
/**
 * Gaming features module
 */
const gamingFeatures = {
    /**
     * Enable or disable game booster (adjusts process priorities)
     * @param {boolean} enabled - Whether to enable or disable game booster
     * @returns {Promise<{success: boolean, error?: string}>} Result of the operation
     */
    setGameBooster: async (enabled) => {
        try {
            if (enabled) {
                // Lower priority of non-essential processes
                const protectedProcessesPattern = `^(${PROTECTED_PROCESSES.join('|')})$`;
                const command = `Get-Process | Where-Object {$_.ProcessName -notmatch '${protectedProcessesPattern}'} | ForEach-Object { $_.PriorityClass = 'BelowNormal' }`;
                const result = await executePowerShellCommand(command);

                if (!result.success) {
                    throw new Error(result.error || 'Failed to set process priorities');
                }

                gameBoosterActive = true;
            } else {
                // Restore normal priorities
                const command = `Get-Process | ForEach-Object { $_.PriorityClass = 'Normal' }`;
                const result = await executePowerShellCommand(command);

                if (!result.success) {
                    throw new Error(result.error || 'Failed to reset process priorities');
                }

                gameBoosterActive = false;
            }

            return {
                success: true,
                enabled: gameBoosterActive
            };
        } catch (error) {
            console.error('Game Booster error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Get the current status of game booster
     * @returns {boolean} Whether game booster is currently active
     */
    getGameBoosterStatus: () => gameBoosterActive,

    /**
     * Optimize system memory by clearing standby list
     * @returns {Promise<{success: boolean, error?: string}>} Result of the operation
     */
    optimizeMemory: async () => {
        try {
            // EmptyStandbyList is a third-party tool that should be included with the application
            const result = await executePowerShellCommand("EmptyStandbyList");

            if (!result.success) {
                throw new Error(result.error || 'Failed to empty standby list');
            }

            return { success: true };
        } catch (error) {
            console.error('Memory optimization error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Set the Windows power plan
     * @param {string} plan - The power plan to set ('high', 'balanced', or 'power-saver')
     * @returns {Promise<{success: boolean, error?: string}>} Result of the operation
     */
    setPowerPlan: async (plan) => {
        try {
            let planGuid;

            switch (plan) {
                case 'high':
                    planGuid = POWER_PLANS.HIGH_PERFORMANCE;
                    break;
                case 'power-saver':
                    planGuid = POWER_PLANS.POWER_SAVER;
                    break;
                case 'balanced':
                default:
                    planGuid = POWER_PLANS.BALANCED;
                    break;
            }

            const cmd = `powercfg /setactive ${planGuid}`;
            const { stdout, stderr } = await execAsync(cmd);

            if (stderr && stderr.trim() !== '') {
                throw new Error(stderr);
            }

            return {
                success: true,
                plan
            };
        } catch (error) {
            console.error('Power plan error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Get the current power plan
     * @returns {Promise<{success: boolean, plan?: string, error?: string}>} The current power plan
     */
    getCurrentPowerPlan: async () => {
        try {
            const { stdout } = await execAsync('powercfg /getactivescheme');

            if (stdout.includes(POWER_PLANS.HIGH_PERFORMANCE)) {
                return { success: true, plan: 'high' };
            } else if (stdout.includes(POWER_PLANS.POWER_SAVER)) {
                return { success: true, plan: 'power-saver' };
            } else {
                return { success: true, plan: 'balanced' };
            }
        } catch (error) {
            console.error('Get power plan error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Enable or disable Windows Game Mode
     * @param {boolean} enabled - Whether to enable or disable Game Mode
     * @returns {Promise<{success: boolean, error?: string}>} Result of the operation
     */
    setGameMode: async (enabled) => {
        try {
            const value = enabled ? '1' : '0';
            const result = await writeRegistryValue(
                REG_PATHS.GAMING.GAME_BAR,
                'AutoGameModeEnabled',
                'REG_DWORD',
                value
            );

            if (!result) {
                throw new Error('Failed to write registry value');
            }

            return {
                success: true,
                enabled
            };
        } catch (error) {
            console.error('Game Mode error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Get the current status of Windows Game Mode
     * @returns {Promise<boolean>} Whether Game Mode is enabled
     */
    getGameModeStatus: async () => {
        try {
            const value = await readRegistryValue(REG_PATHS.GAMING.GAME_BAR, 'AutoGameModeEnabled');
            return value === '0x1';
        } catch (error) {
            console.error('Get game mode status error:', error);
            return false;
        }
    }
};

// ===================================================
// EXPORTS
// ===================================================
module.exports = gamingFeatures;
