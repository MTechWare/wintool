# Clean Recycle Bin contents
# Returns JSON with cleanup statistics

try {
    $filesRemoved = 0
    $totalSizeFreed = 0
    
    # Get all drives and clean their recycle bins
    $drives = Get-WmiObject -Class Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 }
    
    foreach ($drive in $drives) {
        $driveLetter = $drive.DeviceID
        $recycleBinPath = "$driveLetter\`$Recycle.Bin"
        
        if (Test-Path $recycleBinPath) {
            try {
                # Get all files in recycle bin subdirectories
                $recycleFiles = Get-ChildItem -Path $recycleBinPath -File -Recurse -Force -ErrorAction SilentlyContinue |
                               Where-Object { $_.Length -gt 0 }
                
                foreach ($file in $recycleFiles) {
                    try {
                        $fileSize = $file.Length
                        Remove-Item -Path $file.FullName -Force -ErrorAction Stop
                        $filesRemoved++
                        $totalSizeFreed += $fileSize
                    } catch {
                        continue
                    }
                }
                
                # Also remove empty directories
                $recycleDirs = Get-ChildItem -Path $recycleBinPath -Directory -Recurse -Force -ErrorAction SilentlyContinue
                foreach ($dir in $recycleDirs) {
                    try {
                        if ((Get-ChildItem -Path $dir.FullName -Force -ErrorAction SilentlyContinue).Count -eq 0) {
                            Remove-Item -Path $dir.FullName -Force -Recurse -ErrorAction Stop
                        }
                    } catch {
                        continue
                    }
                }
            } catch {
                continue
            }
        }
    }
    
    # Clean thumbnail cache and explorer database files
    $explorerPaths = @(
        "$env:LOCALAPPDATA\Microsoft\Windows\Explorer\thumbcache_*.db",
        "$env:LOCALAPPDATA\Microsoft\Windows\Explorer\iconcache_*.db"
    )
    
    foreach ($explorerPattern in $explorerPaths) {
        try {
            $files = Get-ChildItem -Path $explorerPattern -File -Force -ErrorAction SilentlyContinue |
                     Where-Object { 
                         $_.LastWriteTime -lt (Get-Date).AddDays(-7) -and
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
        category = "recycle"
    }
    
    Write-Output ($result | ConvertTo-Json -Compress)
    
} catch {
    # If anything fails, output minimal result
    $result = @{
        timestamp = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        sizeFreed = 0
        filesRemoved = 0
        category = "recycle"
    }
    Write-Output ($result | ConvertTo-Json -Compress)
}
