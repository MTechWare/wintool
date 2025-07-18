# Scan cache files and calculate total size
# Returns the total size in bytes of cache files that can be cleaned
# Updated to match clean-cache.ps1 logic exactly

try {
    $totalSize = 0
    $ErrorActionPreference = "SilentlyContinue"

    # 1. Scan prefetch files (match clean script - files older than 14 days)
    $prefetchPath = "$env:SystemRoot\Prefetch"
    if (Test-Path $prefetchPath -ErrorAction SilentlyContinue) {
        $oldFiles = Get-ChildItem -Path $prefetchPath -Force -ErrorAction SilentlyContinue |
                   Where-Object {
                       -not $_.PSIsContainer -and
                       $_.Extension -eq ".pf" -and
                       $_.LastWriteTime -lt (Get-Date).AddDays(-14)
                   }

        foreach ($file in $oldFiles) {
            try {
                $totalSize += $file.Length
            } catch {
                continue
            }
        }
    }

    # 2. Scan thumbnail cache
    $thumbCachePath = "$env:LOCALAPPDATA\Microsoft\Windows\Explorer"
    if (Test-Path $thumbCachePath -ErrorAction SilentlyContinue) {
        $thumbFiles = Get-ChildItem -Path $thumbCachePath -Force -ErrorAction SilentlyContinue |
                     Where-Object {
                         -not $_.PSIsContainer -and
                         ($_.Name -like "thumbcache_*.db" -or $_.Name -like "iconcache_*.db")
                     }

        foreach ($file in $thumbFiles) {
            try {
                $totalSize += $file.Length
            } catch {
                continue
            }
        }
    }

    # 3. Define browser cache paths to scan
    $cachePaths = @(
        "$env:LOCALAPPDATA\Microsoft\Windows\INetCache",
        "$env:LOCALAPPDATA\Microsoft\Windows\WebCache",
        "$env:LOCALAPPDATA\Microsoft\Windows\Temporary Internet Files",
        "$env:APPDATA\Microsoft\Windows\Cookies",
        "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache",
        "$env:LOCALAPPDATA\Mozilla\Firefox\Profiles\*\cache2",
        "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache",
        "$env:LOCALAPPDATA\Packages\Microsoft.MicrosoftEdge_*\AC\MicrosoftEdge\Cache"
    )
    
    foreach ($cachePath in $cachePaths) {
        try {
            # Handle wildcard paths
            if ($cachePath -like "*`**") {
                $expandedPaths = Get-ChildItem -Path $cachePath -Directory -Force -ErrorAction SilentlyContinue
                foreach ($expandedPath in $expandedPaths) {
                    try {
                        $files = Get-ChildItem -Path $expandedPath.FullName -File -Recurse -Force -ErrorAction SilentlyContinue |
                                 Where-Object { 
                                     $_.LastWriteTime -lt (Get-Date).AddHours(-1) -and
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
            } else {
                if (Test-Path $cachePath) {
                    try {
                        $files = Get-ChildItem -Path $cachePath -File -Recurse -Force -ErrorAction SilentlyContinue |
                                 Where-Object { 
                                     $_.LastWriteTime -lt (Get-Date).AddHours(-1) -and
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
            }
        } catch {
            continue
        }
    }
    
    # Add system cache locations
    $systemCachePaths = @(
        "$env:SystemRoot\System32\config\systemprofile\AppData\Local\Microsoft\Windows\INetCache",
        "$env:SystemRoot\ServiceProfiles\LocalService\AppData\Local\Microsoft\Windows\INetCache",
        "$env:SystemRoot\ServiceProfiles\NetworkService\AppData\Local\Microsoft\Windows\INetCache"
    )
    
    foreach ($systemPath in $systemCachePaths) {
        if (Test-Path $systemPath) {
            try {
                $files = Get-ChildItem -Path $systemPath -File -Recurse -Force -ErrorAction SilentlyContinue |
                         Where-Object { 
                             $_.LastWriteTime -lt (Get-Date).AddDays(-1) -and
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
    }
    
    # Output the total size in bytes
    Write-Output $totalSize
    
} catch {
    # If anything fails, output 0
    Write-Output 0
}
