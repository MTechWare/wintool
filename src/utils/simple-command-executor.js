/**
 * Simple Command Executor - Direct replacement for PowerShell Pool
 *
 * This is a lightweight, drop-in replacement for the complex PowerShell pool
 * that uses more reliable execution methods.
 *
 * @class SimpleCommandExecutor
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class SimpleCommandExecutor {
    /**
     * Creates a new SimpleCommandExecutor instance.
     * Initializes command cache and timeout settings.
     *
     * @constructor
     */
    constructor() {
        this.commandCache = new Map();
        this.cacheTimeout = 30000; // 30 seconds
    }

    /**
     * Execute PowerShell command using direct exec (simpler and more reliable).
     * Uses Base64 encoding to avoid quote escaping issues and includes caching for read-only commands.
     *
     * @async
     * @param {string} command - The PowerShell command to execute
     * @param {number} [timeout=30000] - Command timeout in milliseconds
     * @returns {Promise<string>} The command output as a string
     * @throws {Error} If command execution fails
     */
    async executePowerShellCommand(command, timeout = 30000) {
        // Check cache for read-only commands
        const cacheKey = this.getCacheKey(command);
        if (this.isReadOnlyCommand(command) && this.commandCache.has(cacheKey)) {
            const cached = this.commandCache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.result;
            } else {
                this.commandCache.delete(cacheKey);
            }
        }

        try {
            // Use Base64 encoding to avoid quote escaping issues entirely
            const encodedCommand = Buffer.from(command, 'utf16le').toString('base64');
            const psCommand = `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${encodedCommand}`;

            const { stdout, stderr } = await execAsync(psCommand, {
                encoding: 'utf8',
                maxBuffer: 1024 * 1024 * 10, // 10MB buffer
                timeout: timeout,
                windowsHide: true,
            });

            if (stderr && stderr.trim()) {
                // Only warn about stderr if it's not a common expected message
                const stderrLower = stderr.toLowerCase();
                if (
                    !stderrLower.includes('cannot find') &&
                    !stderrLower.includes('does not exist') &&
                    !stderrLower.includes('access is denied')
                ) {
                    console.warn(`[SimpleCommandExecutor] PowerShell stderr: ${stderr}`);
                }
            }

            const result = stdout.trim();

            // Cache read-only results
            if (this.isReadOnlyCommand(command)) {
                this.commandCache.set(cacheKey, {
                    result: result,
                    timestamp: Date.now(),
                });
            }

            return result;
        } catch (error) {
            // Don't log expected failures as errors
            if (!this.isExpectedFailure(command, error.message)) {
                console.error(
                    `[SimpleCommandExecutor] PowerShell execution error: ${error.message}`
                );
            }
            throw new Error(`PowerShell command failed: ${error.message}`);
        }
    }

    /**
     * Execute CMD command with error handling and timeout support.
     *
     * @async
     * @param {string} command - The CMD command to execute
     * @param {number} [timeout=30000] - Command timeout in milliseconds
     * @returns {Promise<string>} The command output as a string
     * @throws {Error} If command execution fails
     */
    async executeCmdCommand(command, timeout = 30000) {
        try {
            const { stdout, stderr } = await execAsync(command, {
                encoding: 'utf8',
                maxBuffer: 1024 * 1024 * 10, // 10MB buffer
                timeout: timeout,
                windowsHide: true,
            });

            if (stderr && stderr.trim()) {
                // Only warn about stderr if it's not an expected failure
                if (!this.isExpectedFailure(command, stderr)) {
                    console.warn(`[SimpleCommandExecutor] CMD stderr: ${stderr}`);
                }
            }

            const result = stdout.trim();

            return result;
        } catch (error) {
            // Don't log expected failures as errors
            if (!this.isExpectedFailure(command, error.message)) {
                console.error(`[SimpleCommandExecutor] CMD execution error: ${error.message}`);
            }
            throw new Error(`CMD command failed: ${error.message}`);
        }
    }

    /**
     * Execute command with elevated privileges using PowerShell Start-Process.
     * Properly escapes the command and uses RunAs verb for elevation.
     *
     * @async
     * @param {string} command - The command to execute with elevated privileges
     * @returns {Promise<string>} The command output as a string
     * @throws {Error} If elevated execution fails
     */
    async executeElevatedCommand(command) {
        // Use PowerShell Start-Process with RunAs - properly escape the command
        const escapedCommand = command.replace(/'/g, "''").replace(/"/g, '""');
        const psScript = `Start-Process -Verb RunAs -Wait -FilePath 'cmd.exe' -ArgumentList '/c "${escapedCommand}"'`;
        return this.executePowerShellCommand(psScript);
    }

    /**
     * Get Windows services using WMIC (faster than PowerShell).
     * Falls back to PowerShell if WMIC is not available on newer Windows systems.
     *
     * @async
     * @returns {Promise<Array<{Name: string, DisplayName: string, Status: string, StartType: string}>>} Array of service objects
     * @throws {Error} If both WMIC and PowerShell methods fail
     */
    async getWindowsServices() {
        try {
            const wmicCommand = 'wmic service get Name,DisplayName,State,StartMode /format:csv';
            const result = await this.executeCmdCommand(wmicCommand);

            // Parse CSV output - WMIC CSV format is: Node,DisplayName,Name,StartMode,State
            const lines = result
                .split('\n')
                .filter(line => line.trim() && !line.startsWith('Node'));
            const services = [];

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const parts = line.split(',');
                if (parts.length >= 5) {
                    const service = {
                        Name: (parts[2] || '').trim(),
                        DisplayName: (parts[1] || '').trim(),
                        Status: (parts[4] || '').trim(),
                        StartType: (parts[3] || '').trim(),
                    };

                    // Only add services with valid names
                    if (service.Name) {
                        services.push(service);
                    }
                }
            }

            return services;
        } catch (error) {
            console.log('WMIC not available, using PowerShell fallback');
            // Fallback to PowerShell if WMIC fails (common on newer Windows systems)
            // Use a simpler PowerShell command that works reliably
            const psScript = `Get-Service | Select-Object Name,DisplayName,Status,StartType | ConvertTo-Json`;

            const output = await this.executePowerShellCommand(psScript);
            if (!output || output.trim().length === 0) {
                throw new Error('Both WMIC and PowerShell methods failed to get services');
            }

            const services = JSON.parse(output);
            const servicesArray = Array.isArray(services) ? services : [services];

            // Convert Status numbers to strings for consistency
            return servicesArray.map(service => ({
                Name: service.Name,
                DisplayName: service.DisplayName,
                Status: this.convertStatusToString(service.Status),
                StartType: this.convertStartTypeToString(service.StartType),
            }));
        }
    }

    /**
     * Get disk space using WMIC (faster than PowerShell).
     * Falls back to PowerShell if WMIC fails.
     *
     * @async
     * @returns {Promise<{total: number, free: number, used: number}>} Disk space information in bytes
     * @throws {Error} If both WMIC and PowerShell methods fail
     */
    async getDiskSpace() {
        try {
            const wmicCommand =
                'wmic logicaldisk where "DeviceID=\'C:\'" get Size,FreeSpace /format:csv';
            const result = await this.executeCmdCommand(wmicCommand);

            const lines = result
                .split('\n')
                .filter(line => line.trim() && !line.startsWith('Node'));
            if (lines.length >= 2) {
                const parts = lines[1].split(',');
                const freeSpace = parseInt(parts[0]) || 0;
                const totalSpace = parseInt(parts[1]) || 0;

                return {
                    total: totalSpace,
                    free: freeSpace,
                    used: totalSpace - freeSpace,
                };
            }

            throw new Error('No disk data found');
        } catch (error) {
            // Fallback to PowerShell
            const psScript = `
                $disk = Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID='C:'"
                @{
                    Total = [long]$disk.Size
                    Free = [long]$disk.FreeSpace
                    Used = [long]($disk.Size - $disk.FreeSpace)
                } | ConvertTo-Json
            `;

            const output = await this.executePowerShellCommand(psScript);
            return JSON.parse(output);
        }
    }

    /**
     * Generate a cache key for the given command using Base64 encoding.
     *
     * @param {string} command - The command to generate a cache key for
     * @returns {string} Base64 encoded cache key
     */
    getCacheKey(command) {
        return Buffer.from(command).toString('base64');
    }

    /**
     * Check if a command is read-only and safe to cache.
     * Read-only commands include Get- PowerShell cmdlets, WMIC get commands, etc.
     *
     * @param {string} command - The command to check
     * @returns {boolean} True if the command is read-only and cacheable
     */
    isReadOnlyCommand(command) {
        const readOnlyPatterns = [/^Get-/i, /^wmic\s+\w+\s+get/i, /^dir\s/i, /^type\s/i];
        return readOnlyPatterns.some(pattern => pattern.test(command.trim()));
    }

    /**
     * Check if a command failure is expected (e.g., registry key not found).
     * Determines whether a command failure should be treated as an expected error
     * rather than logging it as an unexpected failure.
     *
     * @param {string} command - The command that was executed
     * @param {string} errorMessage - The error message returned by the command
     * @returns {boolean} True if the failure is expected and should not be logged as an error
     */
    isExpectedFailure(command, errorMessage) {
        const expectedFailures = [
            // Registry query failures
            /unable to find the specified registry key or value/i,
            /invalid key name/i,
            /error: the system was unable to find the specified registry key or value/i,
            // Service not found - more comprehensive patterns
            /could not find files for the given pattern/i,
            /the specified service does not exist/i,
            /service has not been started/i,
            /openservice failed/i,
            /failed to open service/i,
            /service does not exist as an installed service/i,
            // WMIC not available
            /not recognized as an internal or external command/i,
            // PowerShell access denied (common for some registry keys)
            /access is denied/i,
            /unauthorized access/i,
            // Common Windows errors for missing features
            /cannot find path/i,
            /does not exist/i,
            // Exit code patterns for service failures
            /exit code 1060/i, // Service does not exist
            /exit code 1062/i, // Service has not been started
            /exit code 5/i, // Access denied
        ];

        const isRegistryQuery =
            command.includes('reg query') || command.includes('Get-ItemProperty');
        const isWhereCommand = command.includes('where ');
        const isScQuery =
            command.includes('sc query') ||
            command.includes('sc start') ||
            command.includes('sc stop');
        const isWmicCommand = command.includes('wmic ');
        const isServiceQuery = command.includes('Get-Service');

        // Special handling for known problematic services that don't exist on all systems
        const knownMissingServices = [
            'TabletInputService',
            'Fax',
            'WSearch', // Windows Search (disabled on some systems)
            'Spooler', // Print Spooler (disabled on some systems)
            'BITS', // Background Intelligent Transfer Service
            'Themes', // Themes service
            'AudioSrv', // Windows Audio service
        ];

        if (isScQuery && knownMissingServices.some(service => command.includes(service))) {
            return true; // Always treat these as expected failures
        }

        if (isRegistryQuery || isWhereCommand || isScQuery || isWmicCommand || isServiceQuery) {
            return expectedFailures.some(pattern => pattern.test(errorMessage));
        }

        return false;
    }

    /**
     * Convert service status number to string representation.
     * Maps Windows service status codes to human-readable strings.
     *
     * @param {number|string} status - The service status code (1-7) or string
     * @returns {string} Human-readable status string (e.g., 'Running', 'Stopped')
     */
    convertStatusToString(status) {
        const statusMap = {
            1: 'Stopped',
            2: 'StartPending',
            3: 'StopPending',
            4: 'Running',
            5: 'ContinuePending',
            6: 'PausePending',
            7: 'Paused',
        };
        return statusMap[status] || status.toString();
    }

    /**
     * Convert service start type number to string representation.
     * Maps Windows service start type codes to human-readable strings.
     *
     * @param {number|string} startType - The service start type code (0-4) or string
     * @returns {string} Human-readable start type string (e.g., 'Automatic', 'Manual', 'Disabled')
     */
    convertStartTypeToString(startType) {
        const startTypeMap = {
            0: 'Boot',
            1: 'System',
            2: 'Automatic',
            3: 'Manual',
            4: 'Disabled',
        };
        return startTypeMap[startType] || startType.toString();
    }

    /**
     * Cleanup method to clear command cache and free resources.
     * Should be called when the executor is no longer needed.
     *
     * @returns {void}
     */
    cleanup() {
        this.commandCache.clear();
    }

    /**
     * Compatibility method for existing code that expects startup phase completion.
     * This is a no-op method maintained for backward compatibility.
     *
     * @async
     * @returns {Promise<void>} Promise that resolves immediately
     */
    async finishStartupPhase() {
        // No-op for compatibility
        return Promise.resolve();
    }

    /**
     * Detect system capabilities based on available hardware resources.
     * Analyzes memory and CPU count to categorize system performance tier.
     *
     * @async
     * @returns {Promise<string>} System capability tier: 'low-end', 'mid-range', 'high-end', or 'standard'
     * @throws {Error} Returns 'standard' if detection fails
     */
    async detectSystemCapabilities() {
        // Simple capability detection based on system resources
        try {
            const os = require('os');
            const totalMemory = os.totalmem();
            const cpuCount = os.cpus().length;
            const memoryGB = totalMemory / (1024 * 1024 * 1024);

            if (memoryGB < 4 || cpuCount < 4) {
                return 'low-end';
            } else if (memoryGB >= 8 && cpuCount >= 8) {
                return 'high-end';
            } else {
                return 'mid-range';
            }
        } catch (error) {
            console.error(
                `[SimpleCommandExecutor] Error detecting system capabilities: ${error.message}`
            );
            return 'standard';
        }
    }
}

module.exports = SimpleCommandExecutor;
