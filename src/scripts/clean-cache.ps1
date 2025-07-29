# Clean Cache Files

try {
    $filesRemoved = 0
    $totalSizeFreed = 0
    $ErrorActionPreference = "SilentlyContinue"

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
                $fileSize = $file.Length
                Remove-Item -Path $file.FullName -Force -ErrorAction Stop
                $filesRemoved++
                $totalSizeFreed += $fileSize
            } catch {
                continue
            }
        }
    }

    $thumbCachePath = "$env:LOCALAPPDATA\Microsoft\Windows\Explorer"
    if (Test-Path $thumbCachePath -ErrorAction SilentlyContinue) {
        $thumbFiles = Get-ChildItem -Path $thumbCachePath -Force -ErrorAction SilentlyContinue |
                     Where-Object {
                         -not $_.PSIsContainer -and
                         ($_.Name -like "thumbcache_*.db" -or $_.Name -like "iconcache_*.db")
                     }

        foreach ($file in $thumbFiles) {
            try {
                $fileSize = $file.Length
                Remove-Item -Path $file.FullName -Force -ErrorAction Stop
                $filesRemoved++
                $totalSizeFreed += $fileSize
            } catch {
                continue
            }
        }
    }

    $browserCaches = @(
        "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache\*",
        "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache\*",
        "$env:LOCALAPPDATA\Mozilla\Firefox\Profiles\*\cache2\*",
        "$env:APPDATA\Opera Software\Opera Stable\Cache\*"
    )

    foreach ($cachePath in $browserCaches) {
        try {
            $cacheFiles = Get-ChildItem -Path $cachePath -Force -ErrorAction SilentlyContinue |
                         Where-Object { -not $_.PSIsContainer -and $_.LastWriteTime -lt (Get-Date).AddHours(-1) }

            foreach ($file in $cacheFiles) {
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

    $storeCachePath = "$env:LOCALAPPDATA\Packages\Microsoft.WindowsStore_*\LocalCache"
    try {
        $storeCaches = Get-ChildItem -Path $storeCachePath -Force -ErrorAction SilentlyContinue
        foreach ($cache in $storeCaches) {
            if ($cache.PSIsContainer) {
                $cacheFiles = Get-ChildItem -Path $cache.FullName -Recurse -Force -ErrorAction SilentlyContinue |
                             Where-Object { -not $_.PSIsContainer }

                foreach ($file in $cacheFiles) {
                    try {
                        $fileSize = $file.Length
                        Remove-Item -Path $file.FullName -Force -ErrorAction Stop
                        $filesRemoved++
                        $totalSizeFreed += $fileSize
                    } catch {
                        continue
                    }
                }
            }
        }
    } catch {
    }

    $fontCachePath = "$env:SystemRoot\ServiceProfiles\LocalService\AppData\Local\FontCache"
    if (Test-Path $fontCachePath -ErrorAction SilentlyContinue) {
        try {
            $fontCacheFiles = Get-ChildItem -Path $fontCachePath -Force -ErrorAction SilentlyContinue |
                             Where-Object { -not $_.PSIsContainer -and $_.Extension -eq ".dat" }

            foreach ($file in $fontCacheFiles) {
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
        }
    }

    $result = @{
        filesRemoved = $filesRemoved
        sizeFreed = $totalSizeFreed
        category = "cache"
        timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    }

    $result | ConvertTo-Json -Compress

} catch {
    @{
        filesRemoved = 0
        sizeFreed = 0
        category = "cache"
        error = $_.Exception.Message
        timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    } | ConvertTo-Json -Compress
}
