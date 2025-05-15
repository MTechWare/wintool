/**
 * WinTool - System Information Module
 * Provides functions for retrieving system hardware and software information
 *
 * This module collects detailed information about the system's hardware and software
 * using a combination of Node.js built-in modules and external tools.
 */

// ===================================================
// IMPORTS
// ===================================================
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const fs = require('fs');
const path = require('path');

// ===================================================
// CONSTANTS
// ===================================================
const TOOLS_PATH = path.join(__dirname, '..', 'tools');

const SCRIPT_TIMEOUT = 10000; // 10 seconds timeout for script execution
const DEFAULT_DISK_SIZE = 500 * 1024 * 1024 * 1024; // 500 GB default

// ===================================================
// HELPER FUNCTIONS
// ===================================================
/**
 * Get CPU usage using PowerShell as a fallback method
 * @returns {Promise<number>} CPU usage percentage
 */
async function getCpuUsageWmi() {
    try {
        // Use PowerShell to get CPU usage from performance counter
        const { stdout } = await execAsync('powershell -Command "Get-Counter \'\\Processor(_Total)\\% Processor Time\' | Select-Object -ExpandProperty CounterSamples | Select-Object -ExpandProperty CookedValue"');
        const cpuLoad = parseFloat(stdout.trim());
        return Math.round(cpuLoad) || 0;
    } catch (error) {
        console.error('Error getting CPU usage from PowerShell:', error);

        // Try alternative method using Get-WmiObject
        try {
            const { stdout } = await execAsync('powershell -Command "Get-WmiObject Win32_Processor | Measure-Object -Property LoadPercentage -Average | Select-Object -ExpandProperty Average"');
            return parseInt(stdout.trim(), 10) || 0;
        } catch (fallbackError) {
            console.error('Fallback CPU usage method also failed:', fallbackError);
            return estimateCpuUsage();
        }
    }
}

/**
 * Estimate CPU usage based on OS idle time
 * @returns {number} Estimated CPU usage percentage
 */
function estimateCpuUsage() {
    const cpuIdle = os.cpus().reduce((acc, cpu) => acc + cpu.times.idle, 0) / os.cpus().length;
    const cpuTotal = os.cpus().reduce(
        (acc, cpu) => acc + Object.values(cpu.times).reduce((sum, time) => sum + time, 0),
        0
    ) / os.cpus().length;
    return 100 - Math.floor((cpuIdle / cpuTotal) * 100);
}

/**
 * Get disk usage information for the C: drive
 * @returns {Promise<{total: number, free: number, used: number}>} Disk usage information
 */
async function getDiskUsage() {
    try {
        // Use PowerShell to get disk information (more reliable than wmic)
        const { stdout } = await execAsync('powershell -Command "$drive = Get-PSDrive C; $total = $drive.Used + $drive.Free; $used = $drive.Used; $free = $drive.Free; Write-Output \\"$total,$used,$free\\""');

        const values = stdout.trim().split(',');
        if (values.length >= 3) {
            const total = parseInt(values[0], 10) || 0;
            const used = parseInt(values[1], 10) || 0;
            const free = parseInt(values[2], 10) || 0;

            return {
                total,
                used,
                free
            };
        }

        // Fallback to alternative PowerShell method
        const { stdout: altStdout } = await execAsync('powershell -Command "$disk = Get-WmiObject Win32_LogicalDisk -Filter \\"DeviceID=\'C:\'\\"; Write-Output \\"$($disk.Size),$($disk.FreeSpace)\\""');

        const altValues = altStdout.trim().split(',');
        if (altValues.length >= 2) {
            const total = parseInt(altValues[0], 10) || 0;
            const free = parseInt(altValues[1], 10) || 0;

            return {
                total,
                free,
                used: total - free
            };
        }

        // If all methods fail, return default values
        throw new Error('Could not parse disk information');
    } catch (error) {
        console.error('Error getting disk usage:', error);

        // Try one more fallback method
        try {
            const { stdout } = await execAsync('powershell -Command "Get-Volume -DriveLetter C | Select-Object -Property Size,SizeRemaining | ForEach-Object { $_.Size,$_.SizeRemaining }"');
            const values = stdout.trim().split('\n');

            if (values.length >= 2) {
                const total = parseInt(values[0], 10) || 0;
                const free = parseInt(values[1], 10) || 0;

                return {
                    total,
                    free,
                    used: total - free
                };
            }
        } catch (fallbackError) {
            console.error('Fallback disk usage method also failed:', fallbackError);
        }

        // Return default values if all methods fail
        return {
            total: DEFAULT_DISK_SIZE,
            used: DEFAULT_DISK_SIZE * 0.5,
            free: DEFAULT_DISK_SIZE * 0.5
        };
    }
}



// ===================================================
// MAIN FUNCTIONALITY
// ===================================================
/**
 * Get comprehensive system information
 * @returns {Promise<Object>} System information object
 */
async function getSystemInfo() {
    try {
        // Get basic system information from OS module
        const cpus = os.cpus();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const platform = os.platform();
        const release = os.release();
        const hostname = os.hostname();
        const username = os.userInfo().username;

        // Initialize hardware information with defaults
        let cpuUsage = 0;
        let cpuTemp = 0;
        let cpuClock = 0;
        let cpuModel = cpus[0]?.model || 'Unknown CPU';
        let gpuModel = 'Not available';
        let gpuTemp = 0;
        let gpuMemory = 0;
        let gpuLoad = 0;

        // Get CPU usage from WMI
        if (cpuUsage === 0) {
            cpuUsage = await getCpuUsageWmi();
        }

        // Get disk usage information
        const diskInfo = await getDiskUsage();

        // Return comprehensive system information
        return {
            os: `${platform} ${release}`,
            hostname,
            user: username,
            cpu: cpuUsage,
            ram: {
                total: totalMem,
                used: totalMem - freeMem,
                free: freeMem
            },
            disk: diskInfo,
            uptime: os.uptime(),
            cpu_details: {
                model: cpuModel,
                cores: cpus.length,
                temp: cpuTemp,
                clock: cpuClock,
                load: cpuUsage
            },
            gpu_details: {
                model: gpuModel,
                temp: gpuTemp,
                memory: gpuMemory,
                load: gpuLoad
            }
        };
    } catch (error) {
        console.error('Error getting system info:', error);
        throw new Error(`Failed to get system information: ${error.message}`);
    }
}

// ===================================================
// EXPORTS
// ===================================================
module.exports = { getSystemInfo };
