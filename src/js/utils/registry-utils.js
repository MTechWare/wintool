/**
 * WinTool - Registry Utilities Module
 * Provides functions for working with the Windows registry
 *
 * This module contains utility functions for reading, writing, and managing
 * Windows registry keys and values using the reg.exe command-line tool.
 */

// ===================================================
// IMPORTS
// ===================================================
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const REG_PATHS = require('./registry-paths');

// ===================================================
// CONSTANTS
// ===================================================
const REGISTRY_COMMAND_TIMEOUT = 10000; // 10 seconds timeout for registry commands

// ===================================================
// HELPER FUNCTIONS
// ===================================================
/**
 * Execute a registry command with error handling
 * @param {string} command - The registry command to execute
 * @returns {Promise<{success: boolean, stdout?: string, stderr?: string, error?: string}>} Result of the command execution
 */
async function executeRegistryCommand(command) {
    try {
        const { stdout, stderr } = await execAsync(command, { timeout: REGISTRY_COMMAND_TIMEOUT });
        return {
            success: true,
            stdout,
            stderr
        };
    } catch (error) {
        console.error(`Error executing registry command '${command}':`, error);
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
 * Read a value from the Windows registry
 * @param {string} key - Registry key path
 * @param {string} name - Name of the value to read
 * @returns {Promise<string|null>} The registry value or null if not found
 */
async function readRegistryValue(key, name) {
    try {
        const command = `reg query "${key}" /v "${name}"`;
        const result = await executeRegistryCommand(command);

        if (!result.success || !result.stdout) {
            return null;
        }

        // Parse the output to extract the value
        const lines = result.stdout.split('\n');
        for (const line of lines) {
            if (line.includes(name)) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 3) {
                    // The value is typically the last part
                    return parts.slice(2).join(' ');
                }
            }
        }

        return null;
    } catch (error) {
        console.error(`Error reading registry value ${key}\\${name}:`, error);
        return null;
    }
}

/**
 * Write a value to the Windows registry
 * @param {string} key - Registry key path
 * @param {string} name - Name of the value to write
 * @param {string} type - Type of the value (REG_SZ, REG_DWORD, etc.)
 * @param {string|number} value - Value to write
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function writeRegistryValue(key, name, type, value) {
    try {
        // Handle different value types appropriately
        const valueStr = typeof value === 'string' && type !== 'REG_DWORD' ?
            `"${value}"` : value.toString();

        const command = `reg add "${key}" /v "${name}" /t ${type} /d ${valueStr} /f`;
        const result = await executeRegistryCommand(command);

        return result.success;
    } catch (error) {
        console.error(`Error writing registry value ${key}\\${name}:`, error);
        return false;
    }
}

/**
 * Check if a registry key exists
 * @param {string} key - Registry key path
 * @returns {Promise<boolean>} True if the key exists, false otherwise
 */
async function keyExists(key) {
    try {
        const command = `reg query "${key}"`;
        const result = await executeRegistryCommand(command);
        return result.success;
    } catch (error) {
        return false;
    }
}

/**
 * Create a registry key if it doesn't exist
 * @param {string} key - Registry key path
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function createKeyIfNotExists(key) {
    try {
        if (!(await keyExists(key))) {
            const command = `reg add "${key}" /f`;
            const result = await executeRegistryCommand(command);
            return result.success;
        }
        return true;
    } catch (error) {
        console.error(`Error creating registry key ${key}:`, error);
        return false;
    }
}

/**
 * Delete a registry key
 * @param {string} key - Registry key path
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function deleteKey(key) {
    try {
        const command = `reg delete "${key}" /f`;
        const result = await executeRegistryCommand(command);
        return result.success;
    } catch (error) {
        console.error(`Error deleting registry key ${key}:`, error);
        return false;
    }
}

/**
 * Delete a registry value
 * @param {string} key - Registry key path
 * @param {string} name - Name of the value to delete
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function deleteValue(key, name) {
    try {
        const command = `reg delete "${key}" /v "${name}" /f`;
        const result = await executeRegistryCommand(command);
        return result.success;
    } catch (error) {
        console.error(`Error deleting registry value ${key}\\${name}:`, error);
        return false;
    }
}

// ===================================================
// EXPORTS
// ===================================================
module.exports = {
    readRegistryValue,
    writeRegistryValue,
    keyExists,
    createKeyIfNotExists,
    deleteKey,
    deleteValue,
    REG_PATHS
};
