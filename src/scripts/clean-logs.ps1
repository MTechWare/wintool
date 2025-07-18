# Clean system log files
# Returns JSON with cleanup statistics

try {
    $filesRemoved = 0
    $totalSizeFreed = 0
    
    # System log paths (be conservative with system logs)
    $logPaths = @(
        "$env:SystemRoot\Logs\*\*.log",
        "$env:SystemRoot\Debug\*.log",
        "$env:SystemRoot\Panther\*.log"
    )
    
    foreach ($logPattern in $logPaths) {
        try {
            $files = Get-ChildItem -Path $logPattern -File -Force -ErrorAction SilentlyContinue |
                     Where-Object { 
                         $_.LastWriteTime -lt (Get-Date).AddDays(-60) -and
                         $_.Length -gt 10MB
                     }
            
            foreach ($file in $files) {
                try {
                    $fileSize = $file.Length
                    Remove-Item -Path $file.FullName -Force -ErrorAction Stop
                    $filesRemoved++
                    $totalSizeFreed += $fileSize
                } catch {
                    continue
                }
            }
        } catch {
            continue
        }
    }
    
    # Application log paths (safer to clean)
    $appLogPaths = @(
        "$env:LOCALAPPDATA\Temp\*.log",
        "$env:TEMP\*.log"
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
                    $fileSize = $file.Length
                    Remove-Item -Path $file.FullName -Force -ErrorAction Stop
                    $filesRemoved++
                    $totalSizeFreed += $fileSize
                } catch {
                    continue
                }
            }
        } catch {
            continue
        }
    }
    
    # IIS logs (if present)
    $iisLogPaths = @(
        "$env:SystemRoot\System32\LogFiles\W3SVC*\*.log",
        "$env:SystemRoot\System32\LogFiles\HTTPERR\*.log"
    )
    
    foreach ($iisLogPattern in $iisLogPaths) {
        try {
            $files = Get-ChildItem -Path $iisLogPattern -File -Force -ErrorAction SilentlyContinue |
                     Where-Object { 
                         $_.LastWriteTime -lt (Get-Date).AddDays(-30) -and
                         $_.Length -gt 1MB
                     }
            
            foreach ($file in $files) {
                try {
                    $fileSize = $file.Length
                    Remove-Item -Path $file.FullName -Force -ErrorAction Stop
                    $filesRemoved++
                    $totalSizeFreed += $fileSize
                } catch {
                    continue
                }
            }
        } catch {
            continue
        }
    }
    
    # Output JSON result
    $result = @{
        timestamp = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        sizeFreed = $totalSizeFreed
        filesRemoved = $filesRemoved
        category = "logs"
    }
    
    Write-Output ($result | ConvertTo-Json -Compress)
    
} catch {
    # If anything fails, output minimal result
    $result = @{
        timestamp = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        sizeFreed = 0
        filesRemoved = 0
        category = "logs"
    }
    Write-Output ($result | ConvertTo-Json -Compress)
}
