# Scan system log files
# Returns the total size in bytes of log files that can be cleaned

try {
    $totalSize = 0
    
    # System log paths
    $logPaths = @(
        "$env:SystemRoot\Logs\*\*.log",
        "$env:SystemRoot\Logs\*\*.etl",
        "$env:SystemRoot\Debug\*.log",
        "$env:SystemRoot\Panther\*.log",
        "$env:SystemRoot\inf\*.log",
        "$env:SystemRoot\System32\LogFiles\*\*.log",
        "$env:SystemRoot\System32\config\systemprofile\AppData\Local\Microsoft\Windows\WebCache\*.log"
    )
    
    foreach ($logPattern in $logPaths) {
        try {
            $files = Get-ChildItem -Path $logPattern -File -Force -ErrorAction SilentlyContinue |
                     Where-Object { 
                         $_.LastWriteTime -lt (Get-Date).AddDays(-30) -and
                         $_.Length -gt 1MB
                     }
            
            foreach ($file in $files) {
                try {
                    $totalSize += $file.Length
                } catch {
                    continue
                }
            }
        } catch {
            continue
        }
    }
    
    # Application log paths
    $appLogPaths = @(
        "$env:LOCALAPPDATA\Microsoft\Windows\WebCache\*.log",
        "$env:LOCALAPPDATA\Temp\*.log",
        "$env:APPDATA\Microsoft\Windows\Recent\*.log"
    )
    
    foreach ($appLogPattern in $appLogPaths) {
        try {
            $files = Get-ChildItem -Path $appLogPattern -File -Force -ErrorAction SilentlyContinue |
                     Where-Object { 
                         $_.LastWriteTime -lt (Get-Date).AddDays(-7) -and
                         $_.Length -gt 0
                     }
            
            foreach ($file in $files) {
                try {
                    $totalSize += $file.Length
                } catch {
                    continue
                }
            }
        } catch {
            continue
        }
    }
    
    # Event log backup files
    $eventLogPaths = @(
        "$env:SystemRoot\System32\winevt\Logs\Archive-*.evtx",
        "$env:SystemRoot\System32\winevt\Logs\*.evtx.bak"
    )
    
    foreach ($eventLogPattern in $eventLogPaths) {
        try {
            $files = Get-ChildItem -Path $eventLogPattern -File -Force -ErrorAction SilentlyContinue |
                     Where-Object { 
                         $_.LastWriteTime -lt (Get-Date).AddDays(-60) -and
                         $_.Length -gt 10MB
                     }
            
            foreach ($file in $files) {
                try {
                    $totalSize += $file.Length
                } catch {
                    continue
                }
            }
        } catch {
            continue
        }
    }
    
    # Output the total size in bytes
    Write-Output $totalSize
    
} catch {
    # If anything fails, output 0
    Write-Output 0
}
