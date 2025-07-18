# Scan browser cache and temporary files
# Returns the total size in bytes of browser files that can be cleaned

try {
    $totalSize = 0
    
    # Chrome cache paths
    $chromePaths = @(
        "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache",
        "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Code Cache",
        "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\GPUCache",
        "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Media Cache",
        "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Storage\ext"
    )
    
    # Firefox cache paths
    $firefoxPaths = @(
        "$env:LOCALAPPDATA\Mozilla\Firefox\Profiles\*\cache2",
        "$env:LOCALAPPDATA\Mozilla\Firefox\Profiles\*\startupCache",
        "$env:LOCALAPPDATA\Mozilla\Firefox\Profiles\*\OfflineCache"
    )
    
    # Edge cache paths
    $edgePaths = @(
        "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache",
        "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Code Cache",
        "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\GPUCache",
        "$env:LOCALAPPDATA\Packages\Microsoft.MicrosoftEdge_*\AC\MicrosoftEdge\Cache"
    )
    
    # Process all browser cache paths
    $allPaths = $chromePaths + $firefoxPaths + $edgePaths
    
    foreach ($cachePath in $allPaths) {
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
    
    # Output the total size in bytes
    Write-Output $totalSize
    
} catch {
    # If anything fails, output 0
    Write-Output 0
}
