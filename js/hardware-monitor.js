/**
 * WinTool - Hardware Monitor Module
 * Uses OpenHardwareMonitor to provide detailed CPU and GPU information
 */

const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const { app } = require('electron');

// Get the correct path for resources in both development and production
const getResourcePath = () => {
    // Check if we're in development or production
    const isPackaged = app ? app.isPackaged : false;
    
    if (isPackaged) {
        // In production, resources are in the resources directory
        return path.join(process.resourcesPath, 'app.asar.unpacked', 'tools');
    } else {
        // In development, resources are in the project directory
        return path.join(__dirname, '..', 'tools');
    }
};

// Path to OpenHardwareMonitor
const toolsPath = getResourcePath();
const ohmPath = path.join(toolsPath, 'OpenHardwareMonitor', 'OpenHardwareMonitor');
const ohmExePath = path.join(ohmPath, 'OpenHardwareMonitor.exe');
const ohmLibPath = path.join(ohmPath, 'OpenHardwareMonitorLib.dll');

// Temporary file for hardware data
const tempDataFile = path.join(os.tmpdir(), 'wintool-hardware-data.json');
const tempScriptFile = path.join(os.tmpdir(), 'wintool-hardware-monitor.ps1');
const tempLibPath = path.join(os.tmpdir(), 'OpenHardwareMonitorLib.dll');

// Create the PowerShell script content
const createPowerShellScript = () => {
    // Log paths for debugging
    console.log('Tools path:', toolsPath);
    console.log('OHM path:', ohmPath);
    console.log('OHM exe path:', ohmExePath);
    console.log('OHM lib path:', ohmLibPath);
    console.log('Temp lib path:', tempLibPath);
    
    // Check if OpenHardwareMonitor exists and log the result
    const ohmExists = fs.existsSync(ohmPath);
    const ohmLibExists = fs.existsSync(ohmLibPath);
    console.log('OHM directory exists:', ohmExists);
    console.log('OHM lib exists:', ohmLibExists);
    
    // Copy OpenHardwareMonitorLib.dll to temp directory if it exists
    if (ohmLibExists) {
        try {
            fs.copyFileSync(ohmLibPath, tempLibPath);
            console.log('Copied OpenHardwareMonitorLib.dll to:', tempLibPath);
        } catch (err) {
            console.error('Error copying OpenHardwareMonitorLib.dll:', err);
        }
    }
    
    const scriptContent = `
# PowerShell script to collect hardware data using WMI and OpenHardwareMonitor
$ErrorActionPreference = "Continue"

# Log function for debugging
function Write-Log {
    param (
        [string]$Message
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    
    # Write to console
    Write-Host $logMessage
    
    # Write to log file
    $logFile = Join-Path -Path $env:TEMP -ChildPath "wintool-hardware-monitor.log"
    Add-Content -Path $logFile -Value $logMessage
}

try {
    Write-Log "Starting hardware data collection"
    
    # Initialize data object with fallback values
    $data = @{
        cpu = @{
            name = "Unknown"
            cores = 0
            temperature = 0
            load = 0
            clock = 0
        }
        gpu = @{
            name = @()
            memory = 0
            temperature = 0
            load = 0
            clock = 0
        }
    }
    
    # Get CPU info from WMI
    try {
        $cpuInfo = Get-WmiObject -Class Win32_Processor
        if ($cpuInfo) {
            $data.cpu.name = $cpuInfo.Name
            $data.cpu.cores = $cpuInfo.NumberOfCores
            
            # Get CPU clock speed
            $data.cpu.clock = [math]::Round($cpuInfo.CurrentClockSpeed, 0)
            Write-Log "CPU Clock Speed: $($data.cpu.clock) MHz"
            
            # Get CPU load from performance counter
            try {
                $cpuLoad = (Get-Counter '\\\\\\\\Processor(_Total)\\\\\\\\% Processor Time').CounterSamples.CookedValue
                $data.cpu.load = [math]::Round($cpuLoad, 1)
                Write-Log "CPU Load: $($data.cpu.load)%"
            } catch {
                Write-Log "WARNING: Failed to get CPU load from performance counter: $_"
            }
            
            # Try to get CPU temperature using WMI MSAcpi_ThermalZoneTemperature
            try {
                $cpuTemp = Get-WmiObject MSAcpi_ThermalZoneTemperature -Namespace "root/wmi"
                if ($cpuTemp) {
                    # Convert tenths of Kelvin to Celsius
                    $tempKelvin = $cpuTemp.CurrentTemperature / 10
                    $tempCelsius = $tempKelvin - 273.15
                    $data.cpu.temperature = [math]::Round($tempCelsius, 1)
                    Write-Log "CPU Temperature from WMI: $($data.cpu.temperature)°C"
                }
            } catch {
                Write-Log "WARNING: Failed to get CPU temperature from WMI: $_"
                
                # Alternative method using Win32_PerfFormattedData_Counters_ThermalZoneInformation
                try {
                    $thermalInfo = Get-WmiObject -Namespace "root\\cimv2" -Class Win32_PerfFormattedData_Counters_ThermalZoneInformation
                    if ($thermalInfo) {
                        $data.cpu.temperature = [math]::Round($thermalInfo.Temperature, 1)
                        Write-Log "CPU Temperature from Thermal Zone: $($data.cpu.temperature)°C"
                    }
                } catch {
                    Write-Log "WARNING: Failed to get CPU temperature from Thermal Zone: $_"
                }
            }
            
            Write-Log "Got CPU info from WMI: $($cpuInfo.Name), Cores: $($cpuInfo.NumberOfCores), Clock: $($data.cpu.clock) MHz, Load: $($data.cpu.load)%, Temp: $($data.cpu.temperature)°C"
        }
    } catch {
        Write-Log "WARNING: Failed to get CPU info from WMI: $_"
    }
    
    # Get GPU info from WMI
    try {
        $gpuInfos = Get-WmiObject -Class Win32_VideoController
        if ($gpuInfos) {
            $gpuNames = @()
            foreach ($gpu in $gpuInfos) {
                $gpuNames += $gpu.Name
                Write-Log "Found GPU: $($gpu.Name)"
            }
            $data.gpu.name = $gpuNames
            
            # Use the first dedicated GPU for detailed info (prefer AMD or NVIDIA)
            $primaryGpu = $gpuInfos | Where-Object { 
                ($_.Name -match "Radeon RX|GeForce RTX|Radeon Pro|Quadro") -and 
                ($_.Name -notmatch "Intel|Integrated|Parsec") 
            } | Select-Object -First 1
            
            # If no high-end GPU found, try any dedicated GPU
            if (-not $primaryGpu) {
                $primaryGpu = $gpuInfos | Where-Object { 
                    ($_.Name -match "NVIDIA|AMD|Radeon|GeForce") -and 
                    ($_.Name -notmatch "Intel|Integrated|Parsec") 
                } | Select-Object -First 1
            }
            
            if (-not $primaryGpu) {
                $primaryGpu = $gpuInfos[0]  # Fallback to first GPU
            }
            
            # Get GPU memory
            if ($primaryGpu.AdapterRAM) {
                $data.gpu.memory = [math]::Round($primaryGpu.AdapterRAM / 1MB, 0)
                Write-Log "GPU Memory: $($data.gpu.memory) MB"
            }
            
            # Get GPU load using performance counters if available
            try {
                $gpuCounters = Get-Counter -ListSet "GPU Engine" -ErrorAction SilentlyContinue
                if ($gpuCounters) {
                    $gpuLoad = Get-Counter -Counter "\\GPU Engine(*)\\Utilization Percentage" -ErrorAction SilentlyContinue
                    if ($gpuLoad) {
                        $totalLoad = 0
                        $count = 0
                        foreach ($sample in $gpuLoad.CounterSamples) {
                            if ($sample.CookedValue -gt 0) {
                                $totalLoad += $sample.CookedValue
                                $count++
                            }
                        }
                        if ($count -gt 0) {
                            $data.gpu.load = [math]::Round($totalLoad / $count, 1)
                            Write-Log "GPU Load: $($data.gpu.load)%"
                        }
                    }
                }
            } catch {
                Write-Log "WARNING: Failed to get GPU load from performance counters: $_"
            }
            
            Write-Log "Got GPU info from WMI: $($gpuNames -join ', '), Memory: $($data.gpu.memory) MB, Load: $($data.gpu.load)%"
        }
    } catch {
        Write-Log "WARNING: Failed to get GPU info from WMI: $_"
    }
    
    # Try to get more detailed info from OpenHardwareMonitor if available
    try {
        # Get the path to OpenHardwareMonitorLib.dll
        $ohmLibPath = "${tempLibPath.replace(/\\/g, '\\\\')}"
        Write-Log "OpenHardwareMonitorLib path: $ohmLibPath"
        
        # Check if the DLL exists
        if (Test-Path $ohmLibPath) {
            Write-Log "OpenHardwareMonitorLib.dll found"
            
            # Load the DLL
            try {
                Write-Log "Loading OpenHardwareMonitorLib.dll"
                Add-Type -Path $ohmLibPath
                Write-Log "Successfully loaded OpenHardwareMonitorLib.dll"
                
                # Create computer object
                try {
                    Write-Log "Creating Computer object"
                    $computer = New-Object OpenHardwareMonitor.Hardware.Computer
                    $computer.CPUEnabled = $true
                    $computer.GPUEnabled = $true
                    $computer.MainboardEnabled = $true
                    $computer.RAMEnabled = $true
                    $computer.FanControllerEnabled = $false
                    $computer.HDDEnabled = $false
                    $computer.Open()
                    Write-Log "Successfully created and opened Computer object"
                    
                    # Process hardware data
                    Write-Log "Processing hardware data"
                    foreach ($hardware in $computer.Hardware) {
                        Write-Log "Found hardware: $($hardware.Name), Type: $($hardware.HardwareType)"
                        $hardware.Update()
                        
                        # Update subhardware for more detailed sensor data
                        foreach ($subhardware in $hardware.SubHardware) {
                            $subhardware.Update()
                        }
                        
                        if ($hardware.HardwareType -eq [OpenHardwareMonitor.Hardware.HardwareType]::CPU) {
                            $data.cpu.name = $hardware.Name
                            Write-Log "CPU: $($hardware.Name)"
                            
                            foreach ($sensor in $hardware.Sensors) {
                                Write-Log "  CPU Sensor: $($sensor.Name), Type: $($sensor.SensorType), Value: $($sensor.Value)"
                                
                                if ($sensor.SensorType -eq [OpenHardwareMonitor.Hardware.SensorType]::Temperature -and 
                                    ($sensor.Name -eq "CPU Package" -or $sensor.Name -eq "CPU Core" -or $sensor.Name -like "*CPU*")) {
                                    $data.cpu.temperature = [math]::Round($sensor.Value, 1)
                                    Write-Log "  CPU Temperature: $($data.cpu.temperature)°C"
                                }
                                elseif ($sensor.SensorType -eq [OpenHardwareMonitor.Hardware.SensorType]::Load -and 
                                       ($sensor.Name -eq "CPU Total" -or $sensor.Name -eq "CPU Core #1" -or $sensor.Name -like "*CPU*")) {
                                    $data.cpu.load = [math]::Round($sensor.Value, 1)
                                    Write-Log "  CPU Load: $($data.cpu.load)%"
                                }
                                elseif ($sensor.SensorType -eq [OpenHardwareMonitor.Hardware.SensorType]::Clock -and 
                                       ($sensor.Name -eq "CPU Core #1" -or $sensor.Name -like "CPU Core*" -or $sensor.Name -like "*CPU*")) {
                                    $data.cpu.clock = [math]::Round($sensor.Value, 0)
                                    Write-Log "  CPU Clock: $($data.cpu.clock) MHz"
                                }
                            }
                        }
                        elseif ($hardware.HardwareType -eq [OpenHardwareMonitor.Hardware.HardwareType]::GpuNvidia -or 
                               $hardware.HardwareType -eq [OpenHardwareMonitor.Hardware.HardwareType]::GpuAti -or
                               $hardware.HardwareType -eq [OpenHardwareMonitor.Hardware.HardwareType]::GPU) {
                            
                            Write-Log "GPU: $($hardware.Name)"
                            
                            foreach ($sensor in $hardware.Sensors) {
                                Write-Log "  GPU Sensor: $($sensor.Name), Type: $($sensor.SensorType), Value: $($sensor.Value)"
                                
                                if ($sensor.SensorType -eq [OpenHardwareMonitor.Hardware.SensorType]::Temperature -and 
                                    ($sensor.Name -eq "GPU Core" -or $sensor.Name -like "GPU*" -or $sensor.Name -like "*GPU*")) {
                                    $data.gpu.temperature = [math]::Round($sensor.Value, 1)
                                    Write-Log "  GPU Temperature: $($data.gpu.temperature)°C"
                                }
                                elseif ($sensor.SensorType -eq [OpenHardwareMonitor.Hardware.SensorType]::Load -and 
                                       ($sensor.Name -eq "GPU Core" -or $sensor.Name -like "GPU*" -or $sensor.Name -like "*GPU*")) {
                                    $data.gpu.load = [math]::Round($sensor.Value, 1)
                                    Write-Log "  GPU Load: $($data.gpu.load)%"
                                }
                                elseif ($sensor.SensorType -eq [OpenHardwareMonitor.Hardware.SensorType]::Clock -and 
                                       ($sensor.Name -eq "GPU Core" -or $sensor.Name -like "GPU*" -or $sensor.Name -like "*GPU*")) {
                                    $data.gpu.clock = [math]::Round($sensor.Value, 0)
                                    Write-Log "  GPU Clock: $($data.gpu.clock) MHz"
                                }
                                elseif (($sensor.SensorType -eq [OpenHardwareMonitor.Hardware.SensorType]::SmallData -or
                                         $sensor.SensorType -eq [OpenHardwareMonitor.Hardware.SensorType]::Data) -and 
                                       ($sensor.Name -eq "GPU Memory Used" -or $sensor.Name -like "GPU Memory*" -or $sensor.Name -like "*Memory*")) {
                                    $data.gpu.memory = [math]::Round($sensor.Value, 0)
                                    Write-Log "  GPU Memory: $($data.gpu.memory) MB"
                                }
                            }
                        }
                    }
                    
                    # Close the computer object
                    $computer.Close()
                    Write-Log "Closed Computer object"
                } catch {
                    Write-Log "ERROR: Failed to process hardware data with OpenHardwareMonitor: $_"
                    Write-Log "Stack Trace: $($_.ScriptStackTrace)"
                }
            } catch {
                Write-Log "ERROR: Failed to load OpenHardwareMonitorLib.dll: $_"
                Write-Log "Stack Trace: $($_.ScriptStackTrace)"
            }
        } else {
            Write-Log "WARNING: OpenHardwareMonitorLib.dll not found at: $ohmLibPath"
        }
    } catch {
        Write-Log "ERROR: Failed to access OpenHardwareMonitor: $_"
        Write-Log "Stack Trace: $($_.ScriptStackTrace)"
    }
    
    # Create temp directory if it doesn't exist
    $tempDir = [System.IO.Path]::GetTempPath()
    $outputFile = Join-Path -Path $tempDir -ChildPath "wintool-hardware-data.json"
    Write-Log "Output file: $outputFile"
    
    # Convert to JSON and save to temp file
    $jsonData = $data | ConvertTo-Json -Depth 10
    Write-Log "JSON data: $jsonData"
    
    # Write to file without BOM
    $Utf8NoBomEncoding = New-Object System.Text.UTF8Encoding $False
    [System.IO.File]::WriteAllLines($outputFile, $jsonData, $Utf8NoBomEncoding)
    Write-Log "Data written to file without BOM"
    
    Write-Log "Hardware data collection completed successfully"
} catch {
    Write-Log "CRITICAL ERROR: $($_)"
    Write-Log "Stack Trace: $($_.ScriptStackTrace)"
    
    # Create a minimal data structure with error info
    $errorData = @{
        error = $_.Exception.Message
        cpu = @{ name = "Error" }
        gpu = @{ name = @("Error") }
    }
    
    # Save the error data
    $tempDir = [System.IO.Path]::GetTempPath()
    $outputFile = Join-Path -Path $tempDir -ChildPath "wintool-hardware-data.json"
    $errorJson = $errorData | ConvertTo-Json
    
    # Write to file without BOM
    $Utf8NoBomEncoding = New-Object System.Text.UTF8Encoding $False
    [System.IO.File]::WriteAllLines($outputFile, $errorJson, $Utf8NoBomEncoding)
    Write-Log "Error data written to file without BOM"
}
`;
    return scriptContent;
};

/**
 * Get detailed CPU information including model, cores, and temperature
 */
async function getCpuInfo() {
    try {
        const data = await getHardwareData();
        if (!data || !data.cpu) {
            console.log('No CPU data available:', data);
            return { model: 'Unknown', cores: 0, temperature: 0, load: 0 };
        }
        
        return {
            model: data.cpu.name || 'Unknown',
            cores: data.cpu.cores || os.cpus().length,
            temperature: data.cpu.temperature || 0,
            load: data.cpu.load || 0,
            clock: data.cpu.clock || 0
        };
    } catch (error) {
        console.error('Error getting CPU info:', error);
        return { model: 'Unknown', cores: 0, temperature: 0, load: 0 };
    }
}

/**
 * Get detailed GPU information including model, memory, and temperature
 */
async function getGpuInfo() {
    try {
        const data = await getHardwareData();
        if (!data || !data.gpu) {
            console.log('No GPU data available:', data);
            return { model: 'Unknown', memory: 0, temperature: 0, load: 0 };
        }
        
        // If GPU name is an array, prioritize dedicated GPUs
        let gpuModel = data.gpu.name;
        if (Array.isArray(gpuModel)) {
            // First try to find a high-end AMD or NVIDIA GPU
            const highEndGpu = gpuModel.find(gpu => 
                gpu && (
                    gpu.toLowerCase().includes('radeon rx') ||
                    gpu.toLowerCase().includes('geforce rtx') ||
                    gpu.toLowerCase().includes('radeon pro') ||
                    gpu.toLowerCase().includes('quadro')
                )
            );
            
            if (highEndGpu) {
                gpuModel = highEndGpu;
            } else {
                // Try any dedicated GPU
                const dedicatedGpu = gpuModel.find(gpu => 
                    gpu && (
                        (gpu.toLowerCase().includes('radeon') && !gpu.toLowerCase().includes('graphics')) ||
                        gpu.toLowerCase().includes('geforce') ||
                        gpu.toLowerCase().includes('nvidia') ||
                        gpu.toLowerCase().includes('amd') && !gpu.toLowerCase().includes('processor')
                    ) && 
                    !gpu.toLowerCase().includes('intel') && 
                    !gpu.toLowerCase().includes('integrated') &&
                    !gpu.toLowerCase().includes('parsec')
                );
                
                if (dedicatedGpu) {
                    gpuModel = dedicatedGpu;
                } else if (gpuModel.length > 0) {
                    gpuModel = gpuModel[0];
                } else {
                    gpuModel = 'Unknown';
                }
            }
        }
        
        return {
            model: gpuModel || 'Unknown',
            memory: data.gpu.memory || 0,
            temperature: data.gpu.temperature || 0,
            load: data.gpu.load || 0,
            clock: data.gpu.clock || 0
        };
    } catch (error) {
        console.error('Error getting GPU info:', error);
        return { model: 'Unknown', memory: 0, temperature: 0, load: 0 };
    }
}

// Cache for hardware data
let cachedHardwareData = null;
let lastUpdateTime = 0;
const CACHE_DURATION = 5000; // 5 seconds cache duration

/**
 * Run OpenHardwareMonitor and collect hardware data
 */
async function getHardwareData() {
    // Check if we have cached data that's still valid
    const now = Date.now();
    if (cachedHardwareData && (now - lastUpdateTime < CACHE_DURATION)) {
        console.log('Using cached hardware data');
        return cachedHardwareData;
    }
    
    return new Promise((resolve, reject) => {
        try {
            // Create a temporary PowerShell script file
            const scriptContent = createPowerShellScript();
            
            // Ensure OpenHardwareMonitor directory exists
            if (!fs.existsSync(ohmPath)) {
                console.error('OpenHardwareMonitor directory not found at:', ohmPath);
                // Continue with fallback to WMI data
            }
            
            // Write the script to a temporary file
            try {
                fs.writeFileSync(tempScriptFile, scriptContent, { encoding: 'utf8' });
                console.log('PowerShell script written to:', tempScriptFile);
            } catch (writeError) {
                console.error('Error writing PowerShell script:', writeError);
                if (cachedHardwareData) {
                    console.log('Using cached data after write error');
                    return resolve(cachedHardwareData);
                }
                return reject(writeError);
            }
            
            // Execute the PowerShell script with hidden window
            const command = `powershell -ExecutionPolicy Bypass -File "${tempScriptFile}" -WindowStyle Hidden`;
            console.log('Executing command:', command);
            
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error('Error executing hardware monitor script:', error);
                    console.error('Script output:', stdout, stderr);
                    
                    // Try to get basic data from WMI as fallback
                    const fallbackData = {
                        cpu: {
                            name: os.cpus()[0]?.model || 'Unknown',
                            cores: os.cpus().length,
                            load: 0,
                            temperature: 0,
                            clock: 0
                        },
                        gpu: {
                            name: 'Unknown',
                            memory: 0,
                            temperature: 0,
                            load: 0,
                            clock: 0
                        }
                    };
                    
                    console.log('Using fallback data:', fallbackData);
                    return resolve(fallbackData);
                }
                
                console.log('Script executed successfully');
                
                // Read the collected data
                try {
                    if (fs.existsSync(tempDataFile)) {
                        const rawData = fs.readFileSync(tempDataFile, 'utf8');
                        console.log('Raw data file content:', rawData.substring(0, 200) + '...');
                        
                        try {
                            // Remove BOM if present and then parse JSON
                            const cleanData = rawData.replace(/^\uFEFF/, '');
                            const data = JSON.parse(cleanData);
                            console.log('Parsed hardware data:', JSON.stringify(data).substring(0, 200) + '...');
                            
                            // Update cache
                            cachedHardwareData = data;
                            lastUpdateTime = Date.now();
                            
                            resolve(data);
                        } catch (parseError) {
                            console.error('Error parsing JSON data:', parseError);
                            
                            // Use fallback data on parse error
                            const fallbackData = {
                                cpu: {
                                    name: os.cpus()[0]?.model || 'Unknown',
                                    cores: os.cpus().length,
                                    load: 0,
                                    temperature: 0,
                                    clock: 0
                                },
                                gpu: {
                                    name: 'Unknown',
                                    memory: 0,
                                    temperature: 0,
                                    load: 0,
                                    clock: 0
                                }
                            };
                            
                            console.log('Using fallback data after parse error:', fallbackData);
                            
                            // Update cache with fallback data
                            cachedHardwareData = fallbackData;
                            lastUpdateTime = Date.now();
                            
                            resolve(fallbackData);
                        }
                    } else {
                        console.error('Hardware data file not found at:', tempDataFile);
                        
                        // Use fallback data if file not found
                        const fallbackData = {
                            cpu: {
                                name: os.cpus()[0]?.model || 'Unknown',
                                cores: os.cpus().length,
                                load: 0,
                                temperature: 0,
                                clock: 0
                            },
                            gpu: {
                                name: 'Unknown',
                                memory: 0,
                                temperature: 0,
                                load: 0,
                                clock: 0
                            }
                        };
                        
                        console.log('Using fallback data after file not found:', fallbackData);
                        
                        // Update cache with fallback data if we don't have better data
                        if (!cachedHardwareData) {
                            cachedHardwareData = fallbackData;
                            lastUpdateTime = Date.now();
                        }
                        
                        resolve(cachedHardwareData);
                    }
                } catch (readError) {
                    console.error('Error reading hardware data:', readError);
                    
                    // Use fallback data on read error
                    const fallbackData = {
                        cpu: {
                            name: os.cpus()[0]?.model || 'Unknown',
                            cores: os.cpus().length,
                            load: 0,
                            temperature: 0,
                            clock: 0
                        },
                        gpu: {
                            name: 'Unknown',
                            memory: 0,
                            temperature: 0,
                            load: 0,
                            clock: 0
                        }
                    };
                    
                    console.log('Using fallback data after read error:', fallbackData);
                    
                    // Update cache with fallback data if we don't have better data
                    if (!cachedHardwareData) {
                        cachedHardwareData = fallbackData;
                        lastUpdateTime = Date.now();
                    }
                    
                    resolve(cachedHardwareData);
                }
            });
        } catch (error) {
            console.error('Unexpected error in getHardwareData:', error);
            
            // Use fallback data on unexpected error
            const fallbackData = {
                cpu: {
                    name: os.cpus()[0]?.model || 'Unknown',
                    cores: os.cpus().length,
                    load: 0,
                    temperature: 0,
                    clock: 0
                },
                gpu: {
                    name: 'Unknown',
                    memory: 0,
                    temperature: 0,
                    load: 0,
                    clock: 0
                }
            };
            
            console.log('Using fallback data after unexpected error:', fallbackData);
            
            // Update cache with fallback data if we don't have better data
            if (!cachedHardwareData) {
                cachedHardwareData = fallbackData;
                lastUpdateTime = Date.now();
            }
            
            resolve(cachedHardwareData);
        }
    });
}

// Export a simpler function for direct testing
async function testHardwareMonitor() {
    try {
        const data = await getHardwareData();
        console.log('Hardware data test result:', data);
        return data;
    } catch (error) {
        console.error('Hardware monitor test failed:', error);
        return { error: error.message };
    }
}

module.exports = { getCpuInfo, getGpuInfo, testHardwareMonitor };