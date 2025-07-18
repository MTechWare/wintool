# Batch PowerShell Operations Script
# This script consolidates multiple PowerShell operations to reduce process spawning
# Usage: powershell -File batch-operations.ps1 -Operation <operation> -Data <json_data>

param(
    [Parameter(Mandatory=$true)]
    [string]$Operation,
    
    [Parameter(Mandatory=$false)]
    [string]$Data = "{}"
)

# Parse JSON data
try {
    $InputData = $Data | ConvertFrom-Json
} catch {
    Write-Error "Invalid JSON data provided"
    exit 1
}

# Function to safely query registry
function Get-RegistryValue {
    param(
        [string]$Path,
        [string]$Name
    )
    
    try {
        $result = reg query $Path /v $Name 2>$null
        if ($LASTEXITCODE -eq 0) {
            return $result
        } else {
            return $null
        }
    } catch {
        return $null
    }
}

# Function to safely get service status
function Get-ServiceStatus {
    param(
        [string]$ServiceName
    )
    
    try {
        $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
        if ($service) {
            return @{
                Name = $service.Name
                Status = $service.Status.ToString()
                StartType = $service.StartType.ToString()
            }
        } else {
            return @{
                Name = $ServiceName
                Status = "NotFound"
                StartType = "NotFound"
            }
        }
    } catch {
        return @{
            Name = $ServiceName
            Status = "Error"
            StartType = "Error"
        }
    }
}

# Main operation dispatcher
switch ($Operation) {
    "batch-registry-check" {
        $results = @{}
        
        foreach ($check in $InputData.checks) {
            $key = $check.key
            $path = $check.path
            $name = $check.name
            $expectedValue = $check.expectedValue
            
            $regResult = Get-RegistryValue -Path $path -Name $name
            $isMatch = $false
            
            if ($regResult -and $expectedValue) {
                $isMatch = $regResult -match [regex]::Escape($expectedValue)
            }
            
            $results[$key] = @{
                found = $regResult -ne $null
                matches = $isMatch
                output = $regResult
            }
        }
        
        $results | ConvertTo-Json -Depth 3
    }
    
    "batch-service-check" {
        $results = @{}
        
        foreach ($serviceName in $InputData.services) {
            $results[$serviceName] = Get-ServiceStatus -ServiceName $serviceName
        }
        
        $results | ConvertTo-Json -Depth 3
    }
    
    "batch-cleanup-scan" {
        $results = @{}
        $totalSize = 0
        
        foreach ($category in $InputData.categories) {
            try {
                $categorySize = 0
                
                switch ($category) {
                    "temp" {
                        # Temp files scan logic
                        $tempPaths = @($env:TEMP, $env:TMP, "$env:SystemRoot\Temp", "$env:LOCALAPPDATA\Temp")
                        foreach ($tempPath in $tempPaths) {
                            if (Test-Path $tempPath) {
                                $files = Get-ChildItem -Path $tempPath -File -Force -ErrorAction SilentlyContinue |
                                         Where-Object { $_.LastWriteTime -lt (Get-Date).AddHours(-1) -and $_.Length -gt 0 }
                                foreach ($file in $files) {
                                    try { $categorySize += $file.Length } catch { continue }
                                }
                            }
                        }
                    }
                    
                    "cache" {
                        # Cache files scan logic
                        $cachePaths = @(
                            "$env:LOCALAPPDATA\Microsoft\Windows\INetCache",
                            "$env:LOCALAPPDATA\Microsoft\Windows\WebCache",
                            "$env:LOCALAPPDATA\Temp"
                        )
                        foreach ($cachePath in $cachePaths) {
                            if (Test-Path $cachePath) {
                                $files = Get-ChildItem -Path "$cachePath\*" -File -Force -ErrorAction SilentlyContinue |
                                         Where-Object { $_.LastWriteTime -lt (Get-Date).AddHours(-2) -and $_.Length -gt 0 }
                                foreach ($file in $files) {
                                    try { $categorySize += $file.Length } catch { continue }
                                }
                            }
                        }
                    }
                    
                    "system" {
                        # System files scan logic
                        $systemPaths = @(
                            "$env:SystemRoot\Temp\*",
                            "$env:SystemRoot\Logs\MeasuredBoot\*",
                            "$env:SystemRoot\Debug\*"
                        )
                        foreach ($systemPath in $systemPaths) {
                            try {
                                $files = Get-ChildItem -Path $systemPath -File -Force -ErrorAction SilentlyContinue |
                                         Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-14) -and $_.Length -gt 0 }
                                foreach ($file in $files) {
                                    try { $categorySize += $file.Length } catch { continue }
                                }
                            } catch { continue }
                        }
                    }

                    "browser" {
                        # Browser cache scan logic
                        $browserPaths = @(
                            "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache\*",
                            "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache\*",
                            "$env:LOCALAPPDATA\Mozilla\Firefox\Profiles\*\cache2\*"
                        )
                        foreach ($browserPath in $browserPaths) {
                            try {
                                $files = Get-ChildItem -Path $browserPath -File -Force -ErrorAction SilentlyContinue |
                                         Where-Object { $_.LastWriteTime -lt (Get-Date).AddHours(-1) -and $_.Length -gt 0 }
                                foreach ($file in $files) {
                                    try { $categorySize += $file.Length } catch { continue }
                                }
                            } catch { continue }
                        }
                    }

                    "updates" {
                        # Windows Update files scan logic
                        $updatePaths = @(
                            "$env:SystemRoot\SoftwareDistribution\Download\*",
                            "$env:SystemRoot\SoftwareDistribution\DataStore\Logs\*"
                        )
                        foreach ($updatePath in $updatePaths) {
                            try {
                                $files = Get-ChildItem -Path $updatePath -File -Force -ErrorAction SilentlyContinue |
                                         Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) -and $_.Length -gt 0 }
                                foreach ($file in $files) {
                                    try { $categorySize += $file.Length } catch { continue }
                                }
                            } catch { continue }
                        }
                    }

                    "logs" {
                        # Log files scan logic
                        $logPaths = @(
                            "$env:SystemRoot\Logs\*",
                            "$env:LOCALAPPDATA\Microsoft\Windows\WebCache\*.log",
                            "$env:SystemRoot\Debug\*.log"
                        )
                        foreach ($logPath in $logPaths) {
                            try {
                                $files = Get-ChildItem -Path $logPath -File -Force -ErrorAction SilentlyContinue |
                                         Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) -and $_.Length -gt 1MB }
                                foreach ($file in $files) {
                                    try { $categorySize += $file.Length } catch { continue }
                                }
                            } catch { continue }
                        }
                    }

                    "recycle" {
                        # Recycle bin scan logic
                        $recyclePaths = @(
                            "$env:USERPROFILE\AppData\Local\Microsoft\Windows\Explorer\*.db"
                        )
                        foreach ($recyclePath in $recyclePaths) {
                            try {
                                $files = Get-ChildItem -Path $recyclePath -File -Force -ErrorAction SilentlyContinue |
                                         Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) -and $_.Length -gt 1MB }
                                foreach ($file in $files) {
                                    try { $categorySize += $file.Length } catch { continue }
                                }
                            } catch { continue }
                        }
                    }

                    "registry" {
                        # Registry backup files scan logic
                        $registryPaths = @(
                            "$env:SystemRoot\System32\config\RegBack\*",
                            "$env:LOCALAPPDATA\Microsoft\Windows\UsrClass.dat.LOG*"
                        )
                        foreach ($registryPath in $registryPaths) {
                            try {
                                $files = Get-ChildItem -Path $registryPath -File -Force -ErrorAction SilentlyContinue |
                                         Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) -and $_.Length -gt 0 }
                                foreach ($file in $files) {
                                    try { $categorySize += $file.Length } catch { continue }
                                }
                            } catch { continue }
                        }
                    }

                    "dumps" {
                        # Dump files scan logic
                        $dumpPaths = @(
                            "$env:LOCALAPPDATA\CrashDumps\*",
                            "$env:SystemRoot\Minidump\*"
                        )
                        foreach ($dumpPath in $dumpPaths) {
                            try {
                                $files = Get-ChildItem -Path $dumpPath -File -Force -ErrorAction SilentlyContinue |
                                         Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-14) -and $_.Length -gt 1MB }
                                foreach ($file in $files) {
                                    try { $categorySize += $file.Length } catch { continue }
                                }
                            } catch { continue }
                        }
                    }
                }
                
                $results[$category] = $categorySize
                $totalSize += $categorySize
                
            } catch {
                $results[$category] = 0
            }
        }
        
        $results["total"] = $totalSize
        $results | ConvertTo-Json -Depth 2
    }
    
    "system-info-batch" {
        $results = @{}
        
        try {
            # Get basic system info
            $results["platform"] = [System.Environment]::OSVersion.Platform.ToString()
            $results["arch"] = [System.Environment]::ProcessorArchitecture.ToString()
            $results["hostname"] = [System.Environment]::MachineName
            $results["uptime"] = [System.Environment]::TickCount
            
            # Get memory info
            $memory = Get-WmiObject -Class Win32_ComputerSystem -ErrorAction SilentlyContinue
            if ($memory) {
                $results["totalMemory"] = $memory.TotalPhysicalMemory
            }
            
            # Get CPU info
            $cpu = Get-WmiObject -Class Win32_Processor -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($cpu) {
                $results["cpuName"] = $cpu.Name
                $results["cpuCores"] = $cpu.NumberOfCores
                $results["cpuThreads"] = $cpu.NumberOfLogicalProcessors
            }
            
            # Get disk info
            $disks = Get-WmiObject -Class Win32_LogicalDisk -Filter "DriveType=3" -ErrorAction SilentlyContinue
            $results["disks"] = @()
            foreach ($disk in $disks) {
                $results["disks"] += @{
                    drive = $disk.DeviceID
                    size = $disk.Size
                    freeSpace = $disk.FreeSpace
                    used = $disk.Size - $disk.FreeSpace
                }
            }
            
        } catch {
            $results["error"] = $_.Exception.Message
        }
        
        $results | ConvertTo-Json -Depth 3
    }
    
    default {
        Write-Error "Unknown operation: $Operation"
        exit 1
    }
}
