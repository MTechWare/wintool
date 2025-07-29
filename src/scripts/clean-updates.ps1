# Clean Windows Update cache and temporary files
# Returns JSON with cleanup statistics

try {
    $filesRemoved = 0
    $totalSizeFreed = 0
    

    $updatePaths = @(
        "$env:SystemRoot\SoftwareDistribution\Download\*",
        "$env:SystemRoot\SoftwareDistribution\DataStore\Logs\*"
    )
    
    foreach ($updatePattern in $updatePaths) {
        try {
            $files = Get-ChildItem -Path $updatePattern -File -Force -ErrorAction SilentlyContinue |
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
    

    $logPaths = @(
        "$env:SystemRoot\Logs\CBS\*.log",
        "$env:SystemRoot\Logs\DISM\*.log"
    )
    
    foreach ($logPattern in $logPaths) {
        try {
            $files = Get-ChildItem -Path $logPattern -File -Force -ErrorAction SilentlyContinue |
                     Where-Object { 
                         $_.LastWriteTime -lt (Get-Date).AddDays(-14) -and
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
    

    $updateLogPaths = @(
        "$env:SystemRoot\WindowsUpdate.log*",
        "$env:LOCALAPPDATA\Microsoft\Windows\WindowsUpdate.log*"
    )
    
    foreach ($logPattern in $updateLogPaths) {
        try {
            $files = Get-ChildItem -Path $logPattern -File -Force -ErrorAction SilentlyContinue |
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
        category = "updates"
    }
    
    Write-Output ($result | ConvertTo-Json -Compress)
    
} catch {
    # If anything fails, output minimal result
    $result = @{
        timestamp = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        sizeFreed = 0
        filesRemoved = 0
        category = "updates"
    }
    Write-Output ($result | ConvertTo-Json -Compress)
}
