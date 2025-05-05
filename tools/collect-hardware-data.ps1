# PowerShell script to collect hardware data using OpenHardwareMonitor
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
            name = "Unknown"
            memory = 0
            temperature = 0
            load = 0
            clock = 0
        }
    }
    
    # Always get CPU info from WMI first
    try {
        $cpuInfo = Get-WmiObject -Class Win32_Processor
        if ($cpuInfo) {
            $data.cpu.name = $cpuInfo.Name
            $data.cpu.cores = $cpuInfo.NumberOfCores
            # Get CPU load from performance counter
            $cpuLoad = (Get-Counter '\Processor(_Total)\% Processor Time').CounterSamples.CookedValue
            $data.cpu.load = [math]::Round($cpuLoad, 1)
            Write-Log "Got CPU info from WMI: $($cpuInfo.Name), Cores: $($cpuInfo.NumberOfCores), Load: $($data.cpu.load)%"
        }
    } catch {
        Write-Log "WARNING: Failed to get CPU info from WMI: $_"
    }
    
    # Always get GPU info from WMI first
    try {
        $gpuInfo = Get-WmiObject -Class Win32_VideoController
        if ($gpuInfo) {
            $data.gpu.name = $gpuInfo.Name
            if ($gpuInfo.AdapterRAM) {
                $data.gpu.memory = [math]::Round($gpuInfo.AdapterRAM / 1MB, 0)
            }
            Write-Log "Got GPU info from WMI: $($gpuInfo.Name), Memory: $($data.gpu.memory) MB"
        }
    } catch {
        Write-Log "WARNING: Failed to get GPU info from WMI: $_"
    }
    
    # Try to get more detailed info from OpenHardwareMonitor
    try {
        # Get the path to OpenHardwareMonitorLib.dll
        $ohmLibPath = Join-Path -Path $PSScriptRoot -ChildPath "OpenHardwareMonitor\OpenHardwareMonitor\OpenHardwareMonitorLib.dll"
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
                            $data.gpu.name = $hardware.Name
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
                }
            } catch {
                Write-Log "ERROR: Failed to load OpenHardwareMonitorLib.dll: $_"
            }
        } else {
            Write-Log "WARNING: OpenHardwareMonitorLib.dll not found at: $ohmLibPath"
        }
    } catch {
        Write-Log "ERROR: Failed to access OpenHardwareMonitor: $_"
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
    
    # Create a minimal data structure with error info
    $errorData = @{
        error = $_.Exception.Message
        cpu = @{ name = "Error" }
        gpu = @{ name = "Error" }
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
