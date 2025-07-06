# Clean Temporary Files
# Improved version with better performance and safety

try {
    # Initialize counters
    $filesRemoved = 0
    $totalSizeFreed = 0
    $ErrorActionPreference = "SilentlyContinue"

    # Define temp paths to clean
    $tempPaths = @(
        $env:TEMP,
        $env:TMP,
        "$env:SystemRoot\Temp",
        "$env:LOCALAPPDATA\Temp"
    )

    # Remove duplicates and null values
    $tempPaths = $tempPaths | Where-Object { $_ -and (Test-Path $_ -ErrorAction SilentlyContinue) } | Sort-Object -Unique

    foreach ($path in $tempPaths) {
        try {
            # Get files older than 1 hour to avoid cleaning files currently in use
            $cutoffTime = (Get-Date).AddHours(-1)

            # Get files in batches for better performance
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

                        # Try to remove the file
                        Remove-Item -Path $file.FullName -Force -ErrorAction Stop

                        # Update counters only if removal was successful
                        $filesRemoved++
                        $totalSizeFreed += $fileSize

                    } catch {
                        # Skip files that can't be deleted (in use, permissions, etc.)
                        continue
                    }
                }
            }
        } catch {
            # Skip paths that can't be accessed
            continue
        }
    }

    # Clean additional temp locations
    $additionalPaths = @(
        "$env:SystemRoot\SoftwareDistribution\Download\*",
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

    # Output result as JSON
    $result = @{
        filesRemoved = $filesRemoved
        sizeFreed = $totalSizeFreed
        category = "temp"
        timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    }

    $result | ConvertTo-Json -Compress

} catch {
    # Return error in JSON format
    @{
        filesRemoved = 0
        sizeFreed = 0
        category = "temp"
        error = $_.Exception.Message
        timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    } | ConvertTo-Json -Compress
}
