/**
 * Enhanced Command Executor - Alternative to PowerShell Pool
 * 
 * This module provides multiple execution strategies for Windows commands:
 * 1. Direct Node.js child_process execution
 * 2. Execa library for better process management
 * 3. CMD-based execution for PowerShell commands
 * 4. WMI queries via WMIC for system information
 */

const { spawn, exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Try to load execa if available, fallback to child_process
let execa;
try {
    execa = require('execa');
} catch (error) {
    console.warn('Execa not available, using child_process fallback');
    execa = null;
}

class CommandExecutor {
    constructor() {
        this.commandCache = new Map();
        this.cacheTimeout = 30000; // 30 seconds
        this.activeProcesses = 0;
        this.maxActiveProcesses = 5;
        this.pendingOperations = [];
    }

    /**
     * Execute PowerShell command using multiple strategies
     */
    async executePowerShellCommand(command, timeout = 30000) {
        // Check cache first
        const cacheKey = this.getCacheKey(command);
        if (this.isReadOnlyCommand(command) && this.commandCache.has(cacheKey)) {
            const cached = this.commandCache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.result;
            } else {
                this.commandCache.delete(cacheKey);
            }
        }

        let result;

        // Strategy 1: Try execa if available (most reliable)
        if (execa) {
            try {
                result = await this.executeWithExeca('powershell.exe', [
                    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command
                ], timeout);
            } catch (error) {
                console.warn('Execa PowerShell execution failed, trying CMD wrapper:', error.message);
                result = await this.executePowerShellViaCMD(command, timeout);
            }
        } else {
            // Strategy 2: Use CMD wrapper
            result = await this.executePowerShellViaCMD(command, timeout);
        }

        // Cache read-only results
        if (this.isReadOnlyCommand(command)) {
            this.commandCache.set(cacheKey, {
                result: result,
                timestamp: Date.now()
            });
        }

        return result;
    }

    /**
     * Execute PowerShell via CMD wrapper (fallback method)
     */
    async executePowerShellViaCMD(command, timeout = 30000) {
        const escapedCommand = command.replace(/"/g, '\\"');
        const cmdCommand = `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "${escapedCommand}"`;
        return this.executeCmdCommand(cmdCommand, timeout);
    }

    /**
     * Execute using execa library (preferred method)
     */
    async executeWithExeca(executable, args = [], timeout = 30000) {
        if (!execa) {
            throw new Error('Execa not available');
        }

        try {
            const result = await execa(executable, args, {
                timeout: timeout,
                windowsHide: true,
                encoding: 'utf8'
            });
            return result.stdout;
        } catch (error) {
            throw new Error(`Execa execution failed: ${error.message}`);
        }
    }

    /**
     * Execute CMD command directly
     */
    async executeCmdCommand(command, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Command timed out after ${timeout}ms`));
            }, timeout);

            exec(command, { 
                encoding: 'utf8',
                maxBuffer: 1024 * 1024 * 10, // 10MB buffer
                timeout: timeout,
                windowsHide: true
            }, (error, stdout, stderr) => {
                clearTimeout(timeoutId);
                
                if (error) {
                    reject(new Error(`Command failed: ${error.message}`));
                    return;
                }
                
                if (stderr && stderr.trim()) {
                    console.warn('Command stderr:', stderr);
                }
                
                resolve(stdout.trim());
            });
        });
    }

    /**
     * Execute using Node.js spawn (for long-running processes)
     */
    async executeSpawnCommand(executable, args = [], options = {}) {
        return new Promise((resolve, reject) => {
            const defaultOptions = {
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: false,
                windowsHide: true,
                ...options
            };

            const process = spawn(executable, args, defaultOptions);
            let output = '';
            let errorOutput = '';

            process.stdout.on('data', (data) => {
                output += data.toString();
            });

            process.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve(output.trim());
                } else {
                    reject(new Error(`Process exited with code ${code}: ${errorOutput || 'Unknown error'}`));
                }
            });

            process.on('error', (error) => {
                reject(new Error(`Process error: ${error.message}`));
            });
        });
    }

    /**
     * Execute WMI query using WMIC (alternative to PowerShell for system info)
     */
    async executeWmicQuery(query, timeout = 15000) {
        const wmicCommand = `wmic ${query} /format:csv`;
        const result = await this.executeCmdCommand(wmicCommand, timeout);
        
        // Parse CSV output
        const lines = result.split('\n').filter(line => line.trim());
        if (lines.length < 2) return [];
        
        const headers = lines[0].split(',');
        const data = lines.slice(1).map(line => {
            const values = line.split(',');
            const obj = {};
            headers.forEach((header, index) => {
                obj[header.trim()] = values[index] ? values[index].trim() : '';
            });
            return obj;
        });
        
        return data;
    }

    /**
     * Get Windows services using WMIC instead of PowerShell
     */
    async getWindowsServices() {
        try {
            const services = await this.executeWmicQuery('service get Name,DisplayName,State,StartMode');
            return services.map(service => ({
                Name: service.Name,
                DisplayName: service.DisplayName,
                Status: service.State,
                StartType: service.StartMode
            }));
        } catch (error) {
            throw new Error(`Failed to get services: ${error.message}`);
        }
    }

    /**
     * Get system processes using WMIC
     */
    async getSystemProcesses() {
        try {
            const processes = await this.executeWmicQuery('process get Name,ProcessId,PageFileUsage,WorkingSetSize');
            return processes.map(proc => ({
                Name: proc.Name,
                PID: parseInt(proc.ProcessId) || 0,
                MemoryUsage: parseInt(proc.WorkingSetSize) || 0,
                PageFileUsage: parseInt(proc.PageFileUsage) || 0
            }));
        } catch (error) {
            throw new Error(`Failed to get processes: ${error.message}`);
        }
    }

    /**
     * Execute elevated command using runas
     */
    async executeElevatedCommand(command) {
        // Use runas command instead of PowerShell Start-Process
        const runasCommand = `runas /user:Administrator "${command}"`;
        return this.executeCmdCommand(runasCommand);
    }

    /**
     * Utility methods
     */
    getCacheKey(command) {
        return Buffer.from(command).toString('base64');
    }

    isReadOnlyCommand(command) {
        const readOnlyPatterns = [
            /^Get-/i,
            /^wmic\s+\w+\s+get/i,
            /^dir\s/i,
            /^ls\s/i,
            /^type\s/i,
            /^cat\s/i
        ];
        return readOnlyPatterns.some(pattern => pattern.test(command.trim()));
    }

    /**
     * Cleanup method
     */
    cleanup() {
        this.commandCache.clear();
        this.pendingOperations = [];
    }
}

module.exports = CommandExecutor;
