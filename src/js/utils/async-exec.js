/**
 * WinTool - Async Exec Utility
 * Provides promisified versions of child_process exec and execFile
 */

const { exec, execFile } = require('child_process');
const util = require('util');

// Promisify exec and execFile
const execAsync = util.promisify(exec);
const execFileAsync = util.promisify(execFile);

/**
 * Execute a command asynchronously
 * @param {string} command - Command to execute
 * @param {Object} options - Options for exec
 * @returns {Promise<Object>} - Promise that resolves with stdout and stderr
 */
async function execute(command, options = {}) {
    try {
        const { stdout, stderr } = await execAsync(command, options);
        return { stdout, stderr };
    } catch (error) {
        throw error;
    }
}

/**
 * Execute a file asynchronously
 * @param {string} file - File to execute
 * @param {Array<string>} args - Arguments for the file
 * @param {Object} options - Options for execFile
 * @returns {Promise<Object>} - Promise that resolves with stdout and stderr
 */
async function executeFile(file, args = [], options = {}) {
    try {
        const { stdout, stderr } = await execFileAsync(file, args, options);
        return { stdout, stderr };
    } catch (error) {
        throw error;
    }
}

// Export the functions
module.exports = {
    execAsync,
    execFileAsync,
    execute,
    executeFile
};
