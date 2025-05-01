/**
 * WinTool - System Information Module
 * Provides system information data for the dashboard
 */

const os = require('os');
const { exec } = require('child_process');
const si = require('systeminformation');

/**
 * Get system information including OS, CPU, RAM, disk, and network usage
 */
async function getSystemInfo() {
    try {
        // Basic system info
        const cpuUsage = await getCpuUsage();
        const memInfo = await getMemoryInfo();
        const diskInfo = await getDiskInfo();
        const netInfo = await getNetworkInfo();
        
        return {
            os: `${os.type()} ${os.release()}`,
            hostname: os.hostname(),
            user: os.userInfo().username,
            uptime_seconds: os.uptime(),
            cpu: cpuUsage,
            ram: memInfo,
            disk: diskInfo,
            net: netInfo
        };
    } catch (error) {
        console.error('Error getting system info:', error);
        return { error: error.message };
    }
}

/**
 * Get CPU usage percentage
 */
async function getCpuUsage() {
    try {
        const cpuData = await si.currentLoad();
        return cpuData.currentLoad;
    } catch (error) {
        console.error('Error getting CPU usage:', error);
        return 0;
    }
}

/**
 * Get memory usage information
 */
async function getMemoryInfo() {
    try {
        const memData = await si.mem();
        return {
            total: memData.total,
            used: memData.used,
            free: memData.free,
            percent: Math.round((memData.used / memData.total) * 100)
        };
    } catch (error) {
        console.error('Error getting memory info:', error);
        return { total: 0, used: 0, free: 0, percent: 0 };
    }
}

/**
 * Get disk usage information for C: drive
 */
async function getDiskInfo() {
    try {
        const diskData = await si.fsSize();
        const cDrive = diskData.find(disk => disk.mount === 'C:' || disk.mount === '/');
        
        if (cDrive) {
            return {
                total: cDrive.size,
                used: cDrive.used,
                free: cDrive.size - cDrive.used,
                percent: cDrive.use
            };
        }
        
        return { total: 0, used: 0, free: 0, percent: 0 };
    } catch (error) {
        console.error('Error getting disk info:', error);
        return { total: 0, used: 0, free: 0, percent: 0 };
    }
}

/**
 * Get network usage information
 */
async function getNetworkInfo() {
    try {
        const netData = await si.networkStats();
        const mainAdapter = netData[0]; // Use the first adapter
        
        if (mainAdapter) {
            return {
                bytes_sent: mainAdapter.tx_bytes,
                bytes_recv: mainAdapter.rx_bytes
            };
        }
        
        return { bytes_sent: 0, bytes_recv: 0 };
    } catch (error) {
        console.error('Error getting network info:', error);
        return { bytes_sent: 0, bytes_recv: 0 };
    }
}

module.exports = { getSystemInfo };
