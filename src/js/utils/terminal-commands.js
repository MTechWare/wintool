/**
 * WinTool - Terminal Commands Module
 * Provides functions for executing common system commands in PowerShell
 *
 * This module contains a collection of predefined PowerShell commands that can be
 * executed to retrieve system information, network status, and other diagnostics.
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
 * Command timeout in milliseconds
 */
const COMMAND_TIMEOUT = 30000; // 30 seconds

/**
 * Predefined PowerShell commands organized by category
 */
const POWERSHELL_COMMANDS = {
    // System Information Commands
    systeminfo: 'Get-ComputerInfo | Format-List',
    uptime: '((Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime).ToString()',
    env: 'Get-ChildItem Env: | Format-Table -AutoSize',
    wmic: 'Get-WmiObject Win32_BIOS | Format-List',

    // Process Management Commands
    'top-cpu': 'Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 | Format-Table -AutoSize',
    tasklist: 'Get-Process | Select-Object Id,ProcessName,CPU | Sort-Object CPU -Descending | Format-Table -AutoSize',

    // Service Management Commands
    services: 'Get-Service | Where-Object {$_.Status -eq "Running"} | Select-Object Name,DisplayName,Status | Format-Table -AutoSize',
    schtasks: 'Get-ScheduledTask | Select-Object TaskName,State | Format-Table -AutoSize',

    // User Management Commands
    users: 'Get-LocalUser | Where-Object { $_.Enabled -eq $true } | Format-Table Name,Enabled,LastLogon',

    // Network Commands
    ipconfig: 'Get-NetIPConfiguration | Format-List',
    netadapter: 'Get-NetAdapter | Format-Table Name,Status,MacAddress,LinkSpeed -AutoSize',
    ping: 'Test-Connection google.com -Count 4 | Format-Table -AutoSize',
    tracert: 'tracert google.com',
    netstat: 'netstat -ano',

    // Storage Commands
    diskinfo: 'Get-Volume | Format-Table DriveLetter,FileSystemLabel,FileSystem,SizeRemaining,Size -AutoSize'
};

// ===================================================
// MAIN FUNCTIONALITY
// ===================================================
/**
 * Execute a predefined PowerShell command
 * @param {string} cmd - The command identifier (key from POWERSHELL_COMMANDS)
 * @returns {Promise<string>} The command output
 * @throws {Error} If the command fails or is not found
 */
async function executeCommand(cmd) {
    try {
        // Get the PowerShell command
        const command = POWERSHELL_COMMANDS[cmd];

        if (!command) {
            throw new Error(`Unknown or unsupported command: ${cmd}`);
        }

        // Escape double quotes in the command
        const escapedCommand = command.replace(/"/g, '\\"');

        // Construct the full PowerShell command
        const shellCmd = `powershell -NoProfile -Command "${escapedCommand}"`;

        // Execute the command with a timeout
        const { stdout, stderr } = await execAsync(shellCmd, { timeout: COMMAND_TIMEOUT });

        // Check for errors
        if (stderr && stderr.trim() !== '') {
            throw new Error(stderr);
        }

        return stdout;
    } catch (error) {
        console.error(`Error executing command '${cmd}':`, error);
        throw new Error(`Failed to execute command: ${error.message}`);
    }
}

/**
 * Execute a custom PowerShell command
 * @param {string} customCommand - The custom PowerShell command to execute
 * @returns {Promise<string>} The command output
 * @throws {Error} If the command fails
 */
async function executeCustomCommand(customCommand) {
    try {
        if (!customCommand || typeof customCommand !== 'string') {
            throw new Error('Invalid command');
        }

        // Basic sanitization to prevent the most dangerous command injection
        // Allow pipes (|) and other PowerShell operators for more flexibility
        const sanitizedCommand = customCommand
            .replace(/[;&`]/g, '') // Remove command separators and backticks
            .trim();

        // Log the command for debugging
        console.log('Executing custom PowerShell command:', sanitizedCommand);

        // Escape double quotes in the command
        const escapedCommand = sanitizedCommand.replace(/"/g, '\\"');

        // Construct the full PowerShell command
        const shellCmd = `powershell -NoProfile -Command "${escapedCommand}"`;

        // Execute the command with a timeout
        const { stdout, stderr } = await execAsync(shellCmd, { timeout: COMMAND_TIMEOUT });

        // Check for errors, but allow some stderr output as PowerShell often writes to stderr
        // even for successful commands (e.g., progress information)
        if (stderr && stderr.trim() !== '' && !stdout) {
            console.warn('Command produced stderr output:', stderr);
            // Only throw if there's no stdout and stderr indicates a clear error
            if (stderr.toLowerCase().includes('error') ||
                stderr.toLowerCase().includes('exception')) {
                throw new Error(stderr);
            }
        }

        return stdout || stderr; // Return stdout or stderr if stdout is empty
    } catch (error) {
        console.error('Error executing custom command:', error);
        throw new Error(`Failed to execute custom command: ${error.message}`);
    }
}

/**
 * Get a list of available predefined commands
 * @returns {string[]} Array of command identifiers
 */
function getAvailableCommands() {
    return Object.keys(POWERSHELL_COMMANDS);
}

// ===================================================
// EXPORTS
// ===================================================
module.exports = {
    executeCommand,
    executeCustomCommand,
    getAvailableCommands
};
