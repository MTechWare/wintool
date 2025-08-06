const { exec } = require('child_process');
const util = require('util');
const os = require('os');

const execAsync = util.promisify(exec);

/**
 * Timeout wrapper for PowerShell commands to prevent hanging operations.
 * Creates a race condition between the promise and a timeout to ensure commands complete within specified time.
 *
 * @param {Promise} promise - The promise to wrap with timeout
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} description - Description of the operation for error messages
 * @returns {Promise} Promise that resolves with the original promise or rejects with timeout error
 */
function withTimeout(promise, timeoutMs, description) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(
                () => reject(new Error(`${description} timed out after ${timeoutMs}ms`)),
                timeoutMs
            )
        ),
    ]);
}

/**
 * Execute PowerShell command with error handling and timeout support.
 * Provides a standardized way to execute PowerShell commands with proper error handling.
 *
 * @async
 * @param {string} command - The PowerShell command to execute
 * @param {number} [timeout=5000] - Command timeout in milliseconds
 * @returns {Promise<string>} The trimmed stdout from the PowerShell command
 * @throws {Error} If command fails, times out, or returns empty output
 */
async function execPowerShell(command, timeout = 5000) {
    try {
        const { stdout, stderr } = await withTimeout(
            execAsync(`powershell -Command "${command}"`, { encoding: 'utf8' }),
            timeout,
            'PowerShell command'
        );

        if (stderr && stderr.trim()) {
            console.warn(`[WindowsSysInfo] PowerShell stderr: ${stderr}`);
        }

        const result = stdout.trim();
        if (!result) {
            throw new Error('PowerShell command returned empty output');
        }

        return result;
    } catch (error) {
        console.error(`[WindowsSysInfo] PowerShell command failed: ${command} - ${error.message}`);
        throw error;
    }
}

/**
 * Windows System Information class providing comprehensive system data collection.
 * Offers caching, error handling, and fallback mechanisms for reliable system information gathering.
 */
class WindowsSystemInfo {
    /**
     * Creates a new WindowsSystemInfo instance.
     * Initializes cache storage and timeout settings for system information queries.
     *
     * @constructor
     */
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 30 * 1000; // Reduced from 5 minutes to 30 seconds for more responsive memory updates
    }

    /**
     * Clear all cached data to force fresh system information retrieval.
     * Useful when you need immediate updates after system changes.
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cached data or execute command function with caching support.
     * Implements intelligent caching with fallback to expired cache on errors.
     *
     * @async
     * @param {string} key - Cache key for storing/retrieving data
     * @param {Function} commandFunc - Async function to execute if cache miss
     * @param {number} [timeout=5000] - Timeout for command execution in milliseconds
     * @returns {Promise<any>} Cached data or fresh data from command execution
     * @throws {Error} If command fails and no cached data is available
     */
    async getCached(key, commandFunc, timeout = 5000) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        try {
            const data = await commandFunc(timeout);
            this.cache.set(key, { data, timestamp: Date.now() });
            return data;
        } catch (error) {
            // Return cached data if available, even if expired
            if (cached) {
                console.warn(
                    `[WindowsSysInfo] Using expired cache for ${key} due to error: ${error.message}`
                );
                return cached.data;
            }
            throw error;
        }
    }

    /**
     * Get system hardware information including manufacturer, model, and memory.
     * Retrieves basic computer system details using WMI queries.
     *
     * @async
     * @returns {Promise<Object>} System information object with manufacturer, model, version, etc.
     * @throws {Error} If WMI query fails or returns invalid data
     */
    async system() {
        return this.getCached('system', async timeout => {
            // Simplified approach - just get computer system info
            const command = `Get-WmiObject -Class Win32_ComputerSystem | Select-Object Manufacturer, Model, TotalPhysicalMemory, NumberOfProcessors, SystemType | ConvertTo-Json`;
            const output = await execPowerShell(command, timeout);
            const data = JSON.parse(output);

            // Get additional system info
            const systemTypeMap = {
                1: 'Desktop',
                2: 'Mobile',
                3: 'Workstation',
                4: 'Enterprise Server',
                5: 'Small Office/Home Office Server',
                6: 'Appliance PC',
                7: 'Performance Server',
                8: 'Maximum',
            };

            return {
                manufacturer: data.Manufacturer || 'Unknown',
                model: data.Model || 'Unknown',
                version: systemTypeMap[data.SystemType] || 'Desktop',
                serial: '',
                uuid: '',
                sku: '',
            };
        });
    }

    /**
     * Get BIOS/UEFI firmware information.
     * Retrieves BIOS details including vendor, version, release date, and serial number.
     *
     * @async
     * @returns {Promise<Object>} BIOS information object with vendor, version, releaseDate, etc.
     * @throws {Error} If WMI BIOS query fails
     */
    async bios() {
        return this.getCached('bios', async timeout => {
            const command = `Get-WmiObject -Class Win32_BIOS | Select-Object Manufacturer, SMBIOSBIOSVersion, ReleaseDate, SerialNumber | ConvertTo-Json`;
            const output = await execPowerShell(command, timeout);
            const data = JSON.parse(output);

            return {
                vendor: data.Manufacturer || 'Unknown',
                version: data.SMBIOSBIOSVersion || 'Unknown',
                releaseDate: data.ReleaseDate || '',
                revision: '',
                serial: data.SerialNumber || '',
            };
        });
    }

    /**
     * Get motherboard/baseboard information.
     * Retrieves motherboard details including manufacturer, model, version, and serial number.
     *
     * @async
     * @returns {Promise<Object>} Baseboard information object with manufacturer, model, version, etc.
     * @throws {Error} If WMI baseboard query fails
     */
    async baseboard() {
        return this.getCached('baseboard', async timeout => {
            const command = `Get-WmiObject -Class Win32_BaseBoard | Select-Object Manufacturer, Product, Version, SerialNumber | ConvertTo-Json`;
            const output = await execPowerShell(command, timeout);
            const data = JSON.parse(output);

            return {
                manufacturer: data.Manufacturer || 'Unknown',
                model: data.Product || 'Unknown',
                version: data.Version || 'Unknown',
                serial: data.SerialNumber || 'Unknown',
                assetTag: '',
                memMax: null,
                memSlots: null,
            };
        });
    }

    /**
     * Get CPU processor information including cores, speed, and architecture.
     * Retrieves detailed processor information using WMI Win32_Processor class.
     *
     * @async
     * @returns {Promise<Object>} CPU information object with manufacturer, brand, cores, speed, etc.
     * @throws {Error} If WMI processor query fails
     */
    async cpu() {
        return this.getCached('cpu', async timeout => {
            const command = `Get-WmiObject -Class Win32_Processor | Select-Object Name, Manufacturer, MaxClockSpeed, NumberOfCores, NumberOfLogicalProcessors, Architecture, Family | ConvertTo-Json`;
            const output = await execPowerShell(command, timeout);
            const data = Array.isArray(JSON.parse(output))
                ? JSON.parse(output)[0]
                : JSON.parse(output);

            return {
                manufacturer: data.Manufacturer || 'Unknown',
                brand: data.Name || 'Unknown',
                vendor: data.Manufacturer || 'Unknown',
                family: data.Family?.toString() || '',
                model: '',
                stepping: '',
                revision: '',
                voltage: '',
                speed: data.MaxClockSpeed ? data.MaxClockSpeed / 1000 : null,
                speedMin: null,
                speedMax: data.MaxClockSpeed ? data.MaxClockSpeed / 1000 : null,
                governor: '',
                cores: data.NumberOfCores || os.cpus().length,
                physicalCores: data.NumberOfCores || os.cpus().length,
                processors: 1,
                socket: '',
                flags: '',
                virtualization: false,
            };
        });
    }

    /**
     * Get current CPU speed and frequency information.
     * Retrieves real-time processor clock speeds and maximum frequencies.
     *
     * @async
     * @returns {Promise<Object>} CPU speed object with min, max, avg speeds and cores array
     * @throws {Error} If WMI processor speed query fails
     */
    async cpuCurrentSpeed() {
        return this.getCached('cpuCurrentSpeed', async timeout => {
            const command = `Get-WmiObject -Class Win32_Processor | Select-Object CurrentClockSpeed, MaxClockSpeed | ConvertTo-Json`;
            const output = await execPowerShell(command, timeout);
            const data = Array.isArray(JSON.parse(output))
                ? JSON.parse(output)[0]
                : JSON.parse(output);

            const current = data.CurrentClockSpeed ? data.CurrentClockSpeed / 1000 : null;
            const max = data.MaxClockSpeed ? data.MaxClockSpeed / 1000 : null;

            return {
                min: current,
                max: max,
                avg: current,
                cores: [],
            };
        });
    }

    /**
     * Get CPU temperature information (limited availability on Windows).
     * CPU temperature monitoring requires elevated privileges or specialized hardware.
     * Most consumer systems don't expose this through standard WMI queries.
     *
     * @async
     * @returns {Promise<Object>} Temperature object with null values indicating unavailable data
     */
    async cpuTemperature() {
        // CPU temperature monitoring requires elevated privileges or specialized hardware
        // Most consumer systems don't expose this through standard WMI queries
        // Return null to indicate temperature monitoring is not available
        return {
            main: null,
            cores: [],
            max: null,
            socket: [],
            chipset: null,
        };
    }

    /**
     * Get graphics card and display information.
     * Retrieves GPU details including vendor, model, VRAM, driver version, and display resolution.
     * Uses multiple detection methods and fallbacks for comprehensive GPU information.
     *
     * @async
     * @returns {Promise<Object>} Graphics information object with controllers, displays, and primary GPU details
     * @throws {Error} Returns default values if all GPU detection methods fail
     */
    async graphics() {
        return this.getCached('graphics', async timeout => {
            try {
                // Try multiple approaches to get GPU information
                let data = null;

                // First try: Get all video controllers and pick the best one
                try {
                    const command1 = `Get-WmiObject -Class Win32_VideoController | Select-Object Name, DriverVersion, AdapterRAM, CurrentHorizontalResolution, CurrentVerticalResolution | ConvertTo-Json`;
                    const output1 = await execPowerShell(command1, timeout);
                    const allGpus = JSON.parse(output1);

                    if (Array.isArray(allGpus)) {
                        // Filter out basic display adapters and pick the one with most VRAM
                        const realGpus = allGpus.filter(
                            gpu =>
                                gpu.Name &&
                                !gpu.Name.toLowerCase().includes('basic') &&
                                !gpu.Name.toLowerCase().includes('vga') &&
                                gpu.AdapterRAM > 0
                        );

                        if (realGpus.length > 0) {
                            // Sort by VRAM and pick the largest
                            data = realGpus.sort(
                                (a, b) => (b.AdapterRAM || 0) - (a.AdapterRAM || 0)
                            )[0];
                        } else {
                            // Fallback to first GPU
                            data = allGpus[0];
                        }
                    } else {
                        data = allGpus;
                    }
                } catch (error) {
                    console.warn(
                        `[WindowsSysInfo] First GPU detection method failed: ${error.message}`
                    );
                }

                // Second try: Simple approach if first failed
                if (!data || !data.Name) {
                    try {
                        const command2 = `Get-WmiObject -Class Win32_VideoController | Select-Object -First 1 | Select-Object Name, DriverVersion, AdapterRAM | ConvertTo-Json`;
                        const output2 = await execPowerShell(command2, timeout);
                        data = JSON.parse(output2);
                    } catch (error) {
                        console.warn(
                            `[WindowsSysInfo] Second GPU detection method failed: ${error.message}`
                        );
                    }
                }

                // Extract vendor and model information
                let vendor = 'Unknown';
                let model = data?.Name || 'Unknown';

                if (data?.Name) {
                    const name = data.Name.toLowerCase();
                    if (
                        name.includes('nvidia') ||
                        name.includes('geforce') ||
                        name.includes('quadro') ||
                        name.includes('rtx') ||
                        name.includes('gtx')
                    ) {
                        vendor = 'NVIDIA';
                    } else if (
                        name.includes('amd') ||
                        name.includes('radeon') ||
                        name.includes('rx ') ||
                        name.includes('vega')
                    ) {
                        vendor = 'AMD';
                    } else if (
                        name.includes('intel') ||
                        name.includes('uhd') ||
                        name.includes('iris') ||
                        name.includes('hd graphics')
                    ) {
                        vendor = 'Intel';
                    } else {
                        // Try to extract vendor from first word
                        const firstWord = data.Name.split(' ')[0];
                        vendor = firstWord || 'Unknown';
                    }
                }

                // Format VRAM - WMI AdapterRAM is often unreliable, try multiple approaches
                let vramText = 'Unknown';

                if (data?.AdapterRAM && data.AdapterRAM > 0) {
                    // AdapterRAM is in bytes
                    const vramBytes = data.AdapterRAM;
                    const vramMB = Math.round(vramBytes / (1024 * 1024));
                    const vramGB = vramBytes / (1024 * 1024 * 1024);

                    if (vramGB >= 1) {
                        // Round to nearest 0.5 GB for common GPU memory sizes
                        const roundedGB = Math.round(vramGB * 2) / 2;
                        vramText = `${roundedGB} GB`;
                    } else if (vramMB >= 512) {
                        vramText = `${vramMB} MB`;
                    } else {
                        // For very small amounts, might be shared memory
                        vramText = `${vramMB} MB (Shared)`;
                    }
                } else {
                    // Try alternative method using registry or DXDIAG
                    try {
                        // Try to get VRAM from registry
                        const regCommand = `Get-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0*" -Name HardwareInformation.MemorySize -ErrorAction SilentlyContinue | Select-Object -First 1 | ConvertTo-Json`;
                        const regOutput = await execPowerShell(regCommand, 3000);
                        const regData = JSON.parse(regOutput);

                        if (regData && regData['HardwareInformation.MemorySize']) {
                            const vramBytes = regData['HardwareInformation.MemorySize'];
                            const vramGB = vramBytes / (1024 * 1024 * 1024);
                            if (vramGB >= 1) {
                                const roundedGB = Math.round(vramGB * 2) / 2;
                                vramText = `${roundedGB} GB`;
                            } else {
                                const vramMB = Math.round(vramBytes / (1024 * 1024));
                                vramText = `${vramMB} MB`;
                            }
                        }
                    } catch (error) {
                        // Final fallback: try to detect based on GPU model name
                        if (data?.Name) {
                            const name = data.Name.toLowerCase();
                            // NVIDIA RTX 40 series
                            if (name.includes('rtx 4090')) vramText = '24 GB';
                            else if (name.includes('rtx 4080')) vramText = '16 GB';
                            else if (name.includes('rtx 4070 ti')) vramText = '12 GB';
                            else if (name.includes('rtx 4070')) vramText = '12 GB';
                            else if (name.includes('rtx 4060 ti')) vramText = '16 GB';
                            else if (name.includes('rtx 4060')) vramText = '8 GB';
                            // NVIDIA RTX 30 series
                            else if (name.includes('rtx 3090 ti')) vramText = '24 GB';
                            else if (name.includes('rtx 3090')) vramText = '24 GB';
                            else if (name.includes('rtx 3080 ti')) vramText = '12 GB';
                            else if (name.includes('rtx 3080')) vramText = '10 GB';
                            else if (name.includes('rtx 3070 ti')) vramText = '8 GB';
                            else if (name.includes('rtx 3070')) vramText = '8 GB';
                            else if (name.includes('rtx 3060 ti')) vramText = '8 GB';
                            else if (name.includes('rtx 3060')) vramText = '12 GB';
                            // NVIDIA GTX series
                            else if (name.includes('gtx 1660 ti')) vramText = '6 GB';
                            else if (name.includes('gtx 1660')) vramText = '6 GB';
                            else if (name.includes('gtx 1650')) vramText = '4 GB';
                            else if (name.includes('gtx 1080 ti')) vramText = '11 GB';
                            else if (name.includes('gtx 1080')) vramText = '8 GB';
                            else if (name.includes('gtx 1070')) vramText = '8 GB';
                            else if (name.includes('gtx 1060')) vramText = '6 GB';
                            // AMD RX 7000 series
                            else if (name.includes('rx 7900 xtx')) vramText = '24 GB';
                            else if (name.includes('rx 7900 xt')) vramText = '20 GB';
                            else if (name.includes('rx 7800 xt')) vramText = '16 GB';
                            else if (name.includes('rx 7700 xt')) vramText = '12 GB';
                            else if (name.includes('rx 7600')) vramText = '8 GB';
                            // AMD RX 6000 series
                            else if (name.includes('rx 6950 xt')) vramText = '16 GB';
                            else if (name.includes('rx 6900 xt')) vramText = '16 GB';
                            else if (name.includes('rx 6800 xt')) vramText = '16 GB';
                            else if (name.includes('rx 6800')) vramText = '16 GB';
                            else if (name.includes('rx 6700 xt')) vramText = '12 GB';
                            else if (name.includes('rx 6600 xt')) vramText = '8 GB';
                            else if (name.includes('rx 6600')) vramText = '8 GB';
                            // Intel Arc
                            else if (name.includes('arc a770')) vramText = '16 GB';
                            else if (name.includes('arc a750')) vramText = '8 GB';
                            else if (name.includes('arc a580')) vramText = '8 GB';
                            else if (name.includes('arc a380')) vramText = '6 GB';
                            // Intel integrated graphics typically use shared memory
                            else if (
                                name.includes('intel') &&
                                (name.includes('uhd') ||
                                    name.includes('iris') ||
                                    name.includes('hd graphics'))
                            ) {
                                vramText = 'Shared Memory';
                            }
                        }
                    }
                }

                // Get resolution
                let resolution = 'Unknown';
                if (data?.CurrentHorizontalResolution && data?.CurrentVerticalResolution) {
                    resolution = `${data.CurrentHorizontalResolution} x ${data.CurrentVerticalResolution}`;
                } else {
                    // Try to get resolution from system
                    try {
                        const resCommand = `Get-WmiObject -Class Win32_VideoController | Where-Object {$_.CurrentHorizontalResolution -gt 0} | Select-Object -First 1 | Select-Object CurrentHorizontalResolution, CurrentVerticalResolution | ConvertTo-Json`;
                        const resOutput = await execPowerShell(resCommand, 3000);
                        const resData = JSON.parse(resOutput);
                        if (
                            resData?.CurrentHorizontalResolution &&
                            resData?.CurrentVerticalResolution
                        ) {
                            resolution = `${resData.CurrentHorizontalResolution} x ${resData.CurrentVerticalResolution}`;
                        }
                    } catch (error) {
                        // Final fallback
                        resolution = '1920 x 1080';
                    }
                }

                return {
                    controllers: [
                        {
                            vendor: vendor,
                            model: model,
                            bus: '',
                            vram: data?.AdapterRAM
                                ? Math.round(data.AdapterRAM / (1024 * 1024 * 1024))
                                : null,
                            vramDynamic: false,
                            vramText: vramText,
                        },
                    ],
                    displays: [
                        {
                            vendor: '',
                            model: '',
                            main: true,
                            builtin: false,
                            connection: '',
                            sizeX: null,
                            sizeY: null,
                            pixelDepth: null,
                            resolutionX: data?.CurrentHorizontalResolution || null,
                            resolutionY: data?.CurrentVerticalResolution || null,
                            currentResX: data?.CurrentHorizontalResolution || null,
                            currentResY: data?.CurrentVerticalResolution || null,
                            positionX: 0,
                            positionY: 0,
                        },
                    ],
                    driverVersion: data?.DriverVersion || 'Unknown',
                    resolution: resolution,
                    primaryGpu: {
                        vendor: vendor,
                        model: model,
                        vram: vramText,
                        driver: data?.DriverVersion || 'Unknown',
                    },
                };
            } catch (error) {
                console.warn(
                    `[WindowsSysInfo] Graphics information not available: ${error.message}`
                );
                return {
                    controllers: [
                        { vendor: 'Unknown', model: 'Unknown', vram: null, vramText: 'Unknown' },
                    ],
                    displays: [{}],
                    driverVersion: 'Unknown',
                    resolution: 'Unknown',
                    primaryGpu: {
                        vendor: 'Unknown',
                        model: 'Unknown',
                        vram: 'Unknown',
                        driver: 'Unknown',
                    },
                };
            }
        });
    }

    /**
     * Get operating system information including version, build, and installation details.
     * Retrieves comprehensive OS details using WMI Win32_OperatingSystem class.
     *
     * @async
     * @returns {Promise<Object>} OS information object with platform, distro, release, build, etc.
     * @throws {Error} If WMI OS query fails
     */
    async osInfo() {
        return this.getCached('osInfo', async timeout => {
            const command = `Get-WmiObject -Class Win32_OperatingSystem | Select-Object Caption, Version, BuildNumber, OSArchitecture, InstallDate, RegisteredUser, Organization, ProductType, ServicePackMajorVersion, ServicePackMinorVersion | ConvertTo-Json`;
            const output = await execPowerShell(command, timeout);
            const data = JSON.parse(output);

            // Format install date
            let installDate = 'Unknown';
            if (data.InstallDate) {
                try {
                    // WMI date format: YYYYMMDDHHMMSS.FFFFFF+UUU
                    const year = data.InstallDate.substring(0, 4);
                    const month = data.InstallDate.substring(4, 6);
                    const day = data.InstallDate.substring(6, 8);
                    installDate = `${month}/${day}/${year}`;
                } catch (error) {
                    installDate = 'Unknown';
                }
            }

            // Get current user information
            let currentUser = 'Unknown';
            try {
                currentUser = process.env.USERNAME || process.env.USER || 'Unknown';
            } catch (error) {
                currentUser = 'Unknown';
            }

            return {
                platform: 'Windows',
                distro: data.Caption || 'Windows',
                release: data.Version || '',
                codename: '',
                kernel: data.BuildNumber || '',
                arch: data.OSArchitecture || os.arch(),
                hostname: os.hostname(),
                fqdn: os.hostname(),
                codepage: '',
                logofile: '',
                serial: '',
                build: data.BuildNumber || '',
                servicepack: data.ServicePackMajorVersion
                    ? `SP${data.ServicePackMajorVersion}`
                    : '',
                uefi: null,
                installDate: installDate,
                currentUser: currentUser,
            };
        });
    }

    /**
     * Get system memory information including total, free, and used memory.
     * Retrieves memory statistics with fallback to Node.js built-in methods.
     *
     * @async
     * @returns {Promise<Object>} Memory information object with total, free, used, active, available, etc.
     * @throws {Error} Falls back to Node.js os module if WMI query fails
     */
    async mem() {
        try {
            return await this.getCached('mem', async timeout => {
                const command = `$cs = Get-WmiObject Win32_ComputerSystem; $os = Get-WmiObject Win32_OperatingSystem; $total = $cs.TotalPhysicalMemory; $available = $os.FreePhysicalMemory * 1024; $used = $total - $available; @{Total = $total; Available = $available; Used = $used; UsedPercent = [math]::Round(($used / $total) * 100, 2)} | ConvertTo-Json`;
                const output = await execPowerShell(command, timeout);
                if (!output || output.trim() === '') {
                    throw new Error('Empty PowerShell output for memory info');
                }
                const data = JSON.parse(output);

                return {
                    total: parseInt(data.Total) || os.totalmem(),
                    free: parseInt(data.Available) || os.freemem(),
                    used: parseInt(data.Used) || os.totalmem() - os.freemem(),
                    active: parseInt(data.Used) || os.totalmem() - os.freemem(),
                    available: parseInt(data.Available) || os.freemem(),
                    buffers: 0,
                    cached: 0,
                    slab: 0,
                    buffcache: 0,
                    swaptotal: 0,
                    swapused: 0,
                    swapfree: 0,
                };
            });
        } catch (error) {
            console.warn(
                `[WindowsSysInfo] PowerShell memory info failed, using Node.js fallback: ${error.message}`
            );
            // Fallback to Node.js built-in methods
            const total = os.totalmem();
            const free = os.freemem();
            const used = total - free;

            return {
                total: total,
                free: free,
                used: used,
                active: used,
                available: free,
                buffers: 0,
                cached: 0,
                slab: 0,
                buffcache: 0,
                swaptotal: 0,
                swapused: 0,
                swapfree: 0,
            };
        }
    }

    // Disk layout
    async diskLayout() {
        return this.getCached('diskLayout', async timeout => {
            const command = `Get-WmiObject -Class Win32_DiskDrive | Select-Object Model, Size, MediaType, InterfaceType, SerialNumber | ConvertTo-Json`;
            const output = await execPowerShell(command, timeout);
            const data = Array.isArray(JSON.parse(output))
                ? JSON.parse(output)
                : [JSON.parse(output)];

            return data.map((disk, index) => ({
                device: `\\\\.\\PHYSICALDRIVE${index}`,
                type: disk.MediaType || 'Unknown',
                name: disk.Model || 'Unknown',
                vendor: '',
                size: parseInt(disk.Size) || 0,
                bytesPerSector: null,
                totalCylinders: null,
                totalHeads: null,
                totalSectors: null,
                totalTracks: null,
                tracksPerCylinder: null,
                sectorsPerTrack: null,
                firmwareRevision: '',
                serialNum: disk.SerialNumber || '',
                interfaceType: disk.InterfaceType || 'Unknown',
                smartStatus: 'unknown',
                temperature: null,
            }));
        });
    }

    // Filesystem size
    async fsSize() {
        return this.getCached('fsSize', async timeout => {
            const command = `Get-WmiObject -Class Win32_LogicalDisk | Select-Object DeviceID, Size, FreeSpace, FileSystem, VolumeName | ConvertTo-Json`;
            const output = await execPowerShell(command, timeout);
            const data = Array.isArray(JSON.parse(output))
                ? JSON.parse(output)
                : [JSON.parse(output)];

            return data.map(disk => ({
                fs: disk.DeviceID || '',
                type: disk.FileSystem || 'Unknown',
                size: parseInt(disk.Size) || 0,
                used: parseInt(disk.Size) - parseInt(disk.FreeSpace) || 0,
                available: parseInt(disk.FreeSpace) || 0,
                use: disk.Size
                    ? Math.round(
                        ((parseInt(disk.Size) - parseInt(disk.FreeSpace)) / parseInt(disk.Size)) *
                        100
                    )
                    : 0,
                mount: disk.DeviceID || '',
                rw: true,
            }));
        });
    }

    // Network interfaces
    async networkInterfaces() {
        try {
            return await this.getCached('networkInterfaces', async timeout => {
                // Use simpler WMI command that's more compatible
                const command = `Get-WmiObject -Class Win32_NetworkAdapter | Where-Object {$_.NetConnectionStatus -eq 2} | Select-Object Name, MACAddress, Speed, AdapterType | ConvertTo-Json`;

                const output = await execPowerShell(command, timeout);
                if (!output || output.trim() === '') {
                    throw new Error('No network adapters found');
                }

                const data = Array.isArray(JSON.parse(output))
                    ? JSON.parse(output)
                    : [JSON.parse(output)];

                return data.map(iface => ({
                    iface: iface.Name || 'Unknown',
                    ifaceName: iface.Name || 'Unknown',
                    default: false,
                    ip4: '',
                    ip4subnet: '',
                    ip6: '',
                    ip6subnet: '',
                    mac: iface.MACAddress || '',
                    internal: false,
                    virtual: iface.Name && iface.Name.toLowerCase().includes('virtual'),
                    operstate: 'up',
                    type: iface.AdapterType || 'Unknown',
                    duplex: '',
                    mtu: null,
                    speed: iface.Speed ? parseInt(iface.Speed) : null,
                    dhcp: false,
                    dnsSuffix: '',
                    ieee8021xAuth: false,
                    ieee8021xState: '',
                    carrierChanges: 0,
                }));


            });
        } catch (error) {
            console.warn(
                `[WindowsSysInfo] PowerShell network interfaces failed, using Node.js fallback: ${error.message}`
            );
            // Fallback to Node.js built-in os.networkInterfaces()
            const osInterfaces = os.networkInterfaces();
            const fallbackInterfaces = [];

            for (const [name, addresses] of Object.entries(osInterfaces)) {
                // Skip loopback and internal interfaces for the main list
                const nonInternalAddresses = addresses.filter(addr => !addr.internal);
                if (nonInternalAddresses.length > 0) {
                    const primaryAddr =
                        nonInternalAddresses.find(addr => addr.family === 'IPv4') ||
                        nonInternalAddresses[0];
                    fallbackInterfaces.push({
                        iface: name,
                        ifaceName: name,
                        default: false,
                        ip4: primaryAddr.family === 'IPv4' ? primaryAddr.address : '',
                        ip4subnet: '',
                        ip6: primaryAddr.family === 'IPv6' ? primaryAddr.address : '',
                        ip6subnet: '',
                        mac: primaryAddr.mac || '',
                        internal: false,
                        virtual: false,
                        operstate: 'up',
                        type: 'unknown',
                        duplex: '',
                        mtu: null,
                        speed: null,
                        dhcp: false,
                        dnsSuffix: '',
                        ieee8021xAuth: false,
                        ieee8021xState: '',
                        carrierChanges: 0,
                    });
                }
            }

            return fallbackInterfaces;
        }
    }

    // Network statistics - simplified version
    async networkStats(iface = '*') {
        try {
            // Just return basic network interfaces with zero stats
            const interfaces = await this.networkInterfaces();
            return interfaces.map(iface => ({
                iface: iface.iface,
                operstate: iface.operstate,
                rx_bytes: 0,
                rx_dropped: 0,
                rx_errors: 0,
                tx_bytes: 0,
                tx_dropped: 0,
                tx_errors: 0,
                rx_sec: 0,
                tx_sec: 0,
                rx_packets: 0,
                tx_packets: 0,
                ms: Date.now(),
            }));
        } catch (error) {
            console.warn(`[WindowsSysInfo] Network stats failed: ${error.message}`);
            return [];
        }
    }

    // Get cumulative network statistics (simplified - no upload/download data)
    async networkStatsCumulative() {
        try {
            // Just get basic network adapter list
            const command = `Get-WmiObject -Class Win32_NetworkAdapter | Where-Object {$_.NetConnectionStatus -eq 2} | Select-Object Name | ConvertTo-Json`;

            const output = await execPowerShell(command, 5000);
            if (!output || output.trim() === '') {
                throw new Error('No network adapters found');
            }

            const data = Array.isArray(JSON.parse(output))
                ? JSON.parse(output)
                : [JSON.parse(output)];

            // Return basic network info without problematic upload/download stats
            return data.map(adapter => ({
                iface: adapter.Name || 'Unknown',
                operstate: 'up',
                rx_bytes: 0,
                tx_bytes: 0,
                rx_packets: 0,
                tx_packets: 0,
                rx_errors: 0,
                tx_errors: 0,
                rx_dropped: 0,
                tx_dropped: 0,
                ms: Date.now(),
            }));
        } catch (error) {
            console.warn(`[WindowsSysInfo] Network adapter list failed: ${error.message}`);
            return [];
        }
    }

    // Time information
    async time() {
        const now = new Date();
        return {
            current: now.getTime(),
            uptime: os.uptime(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timezoneName: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
    }

    /**
     * Clear all cached system information data.
     * Removes all cached entries to force fresh data retrieval on next queries.
     *
     * @returns {void}
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Force refresh of all system information by clearing cache and retrieving fresh data.
     * Clears the cache and immediately retrieves comprehensive system information.
     *
     * @async
     * @returns {Promise<Object>} Complete system information object with all available data
     * @throws {Error} If system information retrieval fails
     */
    async forceRefresh() {
        this.clearCache();
        return await this.getAllSystemInfo();
    }

    /**
     * Get comprehensive system information from all available sources.
     * Retrieves complete system data including hardware, OS, memory, storage, and network information.
     * Uses Promise.allSettled to ensure partial data is returned even if some queries fail.
     *
     * @async
     * @returns {Promise<Object>} Complete system information object with all subsystem data
     * @throws {Error} If critical system information retrieval fails
     */
    async getAllSystemInfo() {
        try {
            const [
                system,
                bios,
                baseboard,
                cpu,
                cpuCurrentSpeed,
                cpuTemperature,
                osInfo,
                mem,
                diskLayout,
                fsSize,
                networkInterfaces,
                graphics,
            ] = await Promise.allSettled([
                this.system(),
                this.bios(),
                this.baseboard(),
                this.cpu(),
                this.cpuCurrentSpeed(),
                this.cpuTemperature(),
                this.osInfo(),
                this.mem(),
                this.diskLayout(),
                this.fsSize(),
                this.networkInterfaces(),
                this.graphics(),
            ]);

            return {
                system: system.status === 'fulfilled' ? system.value : {},
                bios: bios.status === 'fulfilled' ? bios.value : {},
                baseboard: baseboard.status === 'fulfilled' ? baseboard.value : {},
                cpu: cpu.status === 'fulfilled' ? cpu.value : {},
                cpuCurrentSpeed:
                    cpuCurrentSpeed.status === 'fulfilled' ? cpuCurrentSpeed.value : {},
                cpuTemperature:
                    cpuTemperature.status === 'fulfilled'
                        ? cpuTemperature.value
                        : { main: null, cores: [], max: null },
                osInfo: osInfo.status === 'fulfilled' ? osInfo.value : {},
                mem: mem.status === 'fulfilled' ? mem.value : {},
                diskLayout: diskLayout.status === 'fulfilled' ? diskLayout.value : [],
                fsSize: fsSize.status === 'fulfilled' ? fsSize.value : [],
                networkInterfaces:
                    networkInterfaces.status === 'fulfilled' ? networkInterfaces.value : [],
                graphics:
                    graphics.status === 'fulfilled'
                        ? graphics.value
                        : {
                            controllers: [],
                            displays: [],
                            driverVersion: 'Unknown',
                            resolution: 'Unknown',
                        },
                time: await this.time(),
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            console.error(
                `[WindowsSysInfo] Error getting comprehensive system info: ${error.message}`
            );
            throw error;
        }
    }
}

module.exports = new WindowsSystemInfo();
