# Clean Temporary Files

try {
    $filesRemoved = 0
    $totalSizeFreed = 0
    $ErrorActionPreference = "SilentlyContinue"

    $tempPaths = @(
        $env:TEMP,
        $env:TMP,
        "$env:SystemRoot\Temp",
        "$env:LOCALAPPDATA\Temp"
    )

    $tempPaths = $tempPaths | Where-Object { $_ -and (Test-Path $_ -ErrorAction SilentlyContinue) } | Sort-Object -Unique

    foreach ($path in $tempPaths) {
        try {
            $cutoffTime = (Get-Date).AddHours(-1)
            $files = Get-ChildItem -Path $path -Recurse -Force -ErrorAction SilentlyContinue |
                     Where-Object {
                         -not $_.PSIsContainer -and
                         $_.LastWriteTime -lt $cutoffTime -and
                         $_.Length -gt 0
                     }

            if ($files) {
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
            }
        } catch {
            continue
        }
    }

    $additionalPaths = @(
        "$env:LOCALAPPDATA\Microsoft\Windows\INetCache\*",
        "$env:LOCALAPPDATA\Microsoft\Windows\WebCache\*"
    )

    foreach ($pattern in $additionalPaths) {
        try {
            $items = Get-ChildItem -Path $pattern -Force -ErrorAction SilentlyContinue |
                     Where-Object { -not $_.PSIsContainer -and $_.LastWriteTime -lt (Get-Date).AddHours(-2) }

            foreach ($item in $items) {
                try {
                    $itemSize = $item.Length
                    Remove-Item -Path $item.FullName -Force -ErrorAction Stop
                    $filesRemoved++
                    $totalSizeFreed += $itemSize
                } catch {
                    continue
                }
            }
        } catch {
            continue
        }
    }

    $result = @{
        filesRemoved = $filesRemoved
        sizeFreed = $totalSizeFreed
        category = "temp"
        timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    }

    $result | ConvertTo-Json -Compress

} catch {
    @{
        filesRemoved = 0
        sizeFreed = 0
        category = "temp"
        error = $_.Exception.Message
        timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    } | ConvertTo-Json -Compress
}
