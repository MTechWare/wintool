# Clean system log files

try {
    $filesRemoved = 0
    $totalSizeFreed = 0

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
                         $_.LastWriteTime -lt (Get-Date).AddDays(-7) -and
                         $_.Length -gt 100KB
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
    
    $result = @{
        timestamp = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        sizeFreed = $totalSizeFreed
        filesRemoved = $filesRemoved
        category = "logs"
    }

    Write-Output ($result | ConvertTo-Json -Compress)

} catch {
    $result = @{
        timestamp = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        sizeFreed = 0
        filesRemoved = 0
        category = "logs"
    }
    Write-Output ($result | ConvertTo-Json -Compress)
}
