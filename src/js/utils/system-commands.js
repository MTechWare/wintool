/**
 * WinTool - System Commands Module
 * Provides functions to launch various system tools and utilities
 *
 * This module contains functions for launching Windows system tools and utilities
 * such as Task Manager, Disk Cleanup, and other administrative tools.
 */

// ===================================================
// IMPORTS
// ===================================================
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// ===================================================
// CONSTANTS
// ===================================================
/**
 * Mapping of tool identifiers to their corresponding commands
 */
const SYSTEM_TOOLS = {
    'disk_cleanup': 'cleanmgr',
    'task_manager': 'taskmgr',
    'msconfig': 'msconfig',
    'system_info': 'msinfo32',
    'cmd': 'cmd /c start cmd.exe /k cd /d %USERPROFILE%',
    'power_options': 'control powercfg.cpl',
    'security_center': 'wscui.cpl',
    'device_manager': 'devmgmt.msc',
    'disk_management': 'diskmgmt.msc',
    'services': 'services.msc',
    'event_viewer': 'eventvwr.msc',
    'registry_editor': 'regedit',
    'performance_monitor': 'perfmon.msc'
};

// ===================================================
// HELPER FUNCTIONS
// ===================================================
/**
 * Execute a system command with error handling
 * @param {string} command - The command to execute
 * @returns {Promise<{success: boolean, error?: string}>} Result of the command execution
 */
async function executeCommand(command) {
    try {
        await execAsync(command);
        return { success: true };
    } catch (error) {
        console.error(`Error executing command '${command}':`, error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ===================================================
// MAIN FUNCTIONALITY
// ===================================================
/**
 * Launch Windows Task Manager
 * @returns {Promise<{success: boolean, error?: string}>} Result of the operation
 */
async function launchTaskManager() {
    return executeCommand('taskmgr');
}

/**
 * Launch Windows Disk Cleanup utility
 * @returns {Promise<{success: boolean, error?: string}>} Result of the operation
 */
async function launchDiskCleanup() {
    return executeCommand('cleanmgr');
}

/**
 * Launch a system tool by name
 * @param {string} toolName - Name of the tool to launch
 * @returns {Promise<{success: boolean, error?: string}>} Result of the operation
 */
async function launchSystemTool(toolName) {
    const command = SYSTEM_TOOLS[toolName];

    if (!command) {
        return {
            success: false,
            error: `Unknown system tool: ${toolName}`
        };
    }

    return executeCommand(command);
}

// ===================================================
// EXPORTS
// ===================================================
module.exports = {
    launchTaskManager,
    launchDiskCleanup,
    launchSystemTool
};
