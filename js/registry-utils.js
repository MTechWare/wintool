/**
 * WinTool - Registry Utilities Module
 * Provides functions for working with the Windows registry
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * Read a value from the Windows registry
 * @param {string} key - Registry key path
 * @param {string} name - Name of the value to read
 */
async function readRegistryValue(key, name) {
    try {
        const command = `reg query "${key}" /v "${name}"`;
        const { stdout } = await execAsync(command);
        
        // Parse the output to extract the value
        const lines = stdout.split('\n');
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
 */
async function writeRegistryValue(key, name, type, value) {
    try {
        const command = `reg add "${key}" /v "${name}" /t ${type} /d "${value}" /f`;
        await execAsync(command);
        return true;
    } catch (error) {
        console.error(`Error writing registry value ${key}\\${name}:`, error);
        return false;
    }
}

module.exports = {
    readRegistryValue,
    writeRegistryValue
};
