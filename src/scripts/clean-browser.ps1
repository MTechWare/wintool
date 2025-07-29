# Clean browser cache and temporary files

try {
    $filesRemoved = 0
    $totalSizeFreed = 0

    $chromePaths = @(
        "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache",
        "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Code Cache",
        "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\GPUCache",
        "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Media Cache"
    )

    $firefoxPaths = @(
        "$env:LOCALAPPDATA\Mozilla\Firefox\Profiles\*\cache2",
        "$env:LOCALAPPDATA\Mozilla\Firefox\Profiles\*\startupCache"
    )

    $edgePaths = @(
        "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache",
        "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Code Cache",
        "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\GPUCache"
    )

    $allPaths = $chromePaths + $firefoxPaths + $edgePaths
    
    foreach ($cachePath in $allPaths) {
        try {
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
            }
        } catch {
            continue
        }
    }
    
    $result = @{
        timestamp = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        sizeFreed = $totalSizeFreed
        filesRemoved = $filesRemoved
        category = "browser"
    }

    Write-Output ($result | ConvertTo-Json -Compress)

} catch {
    $result = @{
        timestamp = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        sizeFreed = 0
        filesRemoved = 0
        category = "browser"
    }
    Write-Output ($result | ConvertTo-Json -Compress)
}
