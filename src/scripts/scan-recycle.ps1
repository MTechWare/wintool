# Scan Recycle Bin contents
# Returns the total size in bytes of files in the Recycle Bin

try {
    $totalSize = 0
    
    # Get all drives and check their recycle bins
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
                        $totalSize += $file.Length
                    } catch {
                        continue
                    }
                }
            } catch {
                continue
            }
        }
    }
    
    # Also check user-specific recycle bin locations
    $userRecyclePaths = @(
        "$env:USERPROFILE\AppData\Local\Microsoft\Windows\Explorer\*.db",
        "$env:LOCALAPPDATA\Microsoft\Windows\Explorer\thumbcache_*.db"
    )
    
    foreach ($userPath in $userRecyclePaths) {
        try {
            $files = Get-ChildItem -Path $userPath -File -Force -ErrorAction SilentlyContinue |
                     Where-Object { 
                         $_.LastWriteTime -lt (Get-Date).AddDays(-7) -and
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
    
    # Output the total size in bytes
    Write-Output $totalSize
    
} catch {
    # If anything fails, output 0
    Write-Output 0
}
