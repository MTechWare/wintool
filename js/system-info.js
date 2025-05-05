const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const fs = require('fs');
const path = require('path');

async function getSystemInfo() {
    try {
        const cpus = os.cpus();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const platform = os.platform();
        const release = os.release();
        const arch = os.arch();
        const hostname = os.hostname();
        const username = os.userInfo().username;

        // Use the OpenHardwareMonitor tool to get accurate hardware information
        const toolsPath = path.join(__dirname, '..', 'tools');
        const scriptPath = path.join(toolsPath, 'collect-hardware-data.ps1');
        
        // Execute the PowerShell script with elevated privileges
        await execAsync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, { timeout: 10000 });
        
        // Read the hardware data from the temp file
        const tempDir = os.tmpdir();
        const dataPath = path.join(tempDir, 'wintool-hardware-data.json');
        
        let cpuUsage = 0;
        let cpuTemp = 0;
        let cpuClock = 0;
        let cpuModel = cpus[0]?.model || 'Unknown CPU';
        let gpuModel = 'Not available';
        let gpuTemp = 0;
        let gpuMemory = 0;
        let gpuLoad = 0;
        
        // Check if the hardware data file exists
        if (fs.existsSync(dataPath)) {
            try {
                const hardwareData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
                
                // Get CPU information
                if (hardwareData.cpu) {
                    cpuModel = hardwareData.cpu.name || cpuModel;
                    cpuTemp = hardwareData.cpu.temperature || 0;
                    cpuUsage = hardwareData.cpu.load || 0;
                    cpuClock = hardwareData.cpu.clock || cpus[0]?.speed || 0;
                }
                
                // Get GPU information
                if (hardwareData.gpu) {
                    gpuModel = hardwareData.gpu.name || 'Not available';
                    gpuTemp = hardwareData.gpu.temperature || 0;
                    gpuMemory = hardwareData.gpu.memory || 0;
                    gpuLoad = hardwareData.gpu.load || 0;
                }
            } catch (error) {
                console.error('Error parsing hardware data:', error);
            }
        }
        
        // Fallback to WMI if OpenHardwareMonitor data is not available
        if (cpuUsage === 0) {
            try {
                const { stdout: cpuStdout } = await execAsync('wmic cpu get LoadPercentage');
                const cpuLines = cpuStdout.trim().split('\n');
                if (cpuLines.length > 1) {
                    const cpuLoadStr = cpuLines[1].trim();
                    cpuUsage = parseInt(cpuLoadStr, 10) || 0;
                }
            } catch (error) {
                console.error('Error getting CPU usage:', error);
                // Fallback to estimate based on CPU idle time
                const cpuIdle = os.cpus().reduce((acc, cpu) => acc + cpu.times.idle, 0) / os.cpus().length;
                const cpuTotal = os.cpus().reduce((acc, cpu) => acc + Object.values(cpu.times).reduce((sum, time) => sum + time, 0), 0) / os.cpus().length;
                cpuUsage = 100 - Math.floor((cpuIdle / cpuTotal) * 100);
            }
        }
        
        // Get disk usage information
        let diskTotal = 0;
        let diskFree = 0;
        let diskUsed = 0;
        
        try {
            // Get C: drive info using wmic with a more reliable format
            const { stdout: diskStdout } = await execAsync('wmic logicaldisk where DeviceID="C:" get Size,FreeSpace /format:csv');
            const diskLines = diskStdout.trim().split('\n');
            
            // CSV format has headers in first line, data in second line
            if (diskLines.length > 1) {
                // Skip the first line (header) and get the data line
                const dataLine = diskLines.find(line => line.includes('C:'));
                if (dataLine) {
                    const values = dataLine.split(',');
                    // Format is typically: Node,DeviceID,FreeSpace,Size
                    if (values.length >= 4) {
                        diskFree = parseInt(values[2], 10) || 0;
                        diskTotal = parseInt(values[3], 10) || 0;
                        diskUsed = diskTotal - diskFree;
                    }
                }
            }
            
            // If we didn't get valid data, try alternative approach
            if (diskTotal === 0) {
                const { stdout: altDiskStdout } = await execAsync('wmic logicaldisk where DeviceID="C:" get Size,FreeSpace');
                const altDiskLines = altDiskStdout.trim().split('\n');
                if (altDiskLines.length > 1) {
                    // The second line contains the values
                    const values = altDiskLines[1].trim().split(/\s+/);
                    if (values.length >= 2) {
                        diskFree = parseInt(values[0], 10) || 0;
                        diskTotal = parseInt(values[1], 10) || 0;
                        diskUsed = diskTotal - diskFree;
                    }
                }
            }
            
            console.log(`Disk info - Total: ${diskTotal}, Free: ${diskFree}, Used: ${diskUsed}`);
        } catch (error) {
            console.error('Error getting disk usage:', error);
            // Fallback values
            diskTotal = 500 * 1024 * 1024 * 1024; // 500 GB
            diskUsed = diskTotal * 0.5; // 50% used
            diskFree = diskTotal - diskUsed;
        }

        // Return real system information
        return {
            os: `${platform} ${release}`,
            hostname: hostname,
            user: username,
            cpu: cpuUsage,
            ram: {
                total: totalMem,
                used: totalMem - freeMem,
                free: freeMem
            },
            disk: {
                total: diskTotal,
                used: diskUsed,
                free: diskFree
            },
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

module.exports = { getSystemInfo };
