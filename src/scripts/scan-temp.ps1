# Scan temporary files and calculate total size
# Returns the total size in bytes of temporary files that can be cleaned
# Updated to match clean-temp.ps1 logic exactly

try {
    $totalSize = 0
    $ErrorActionPreference = "SilentlyContinue"

    # Define temp paths to scan (same as clean script)
    $tempPaths = @(
        $env:TEMP,
        $env:TMP,
        "$env:SystemRoot\Temp",
        "$env:LOCALAPPDATA\Temp"
    )

    # Remove duplicates and null values (same as clean script)
    $tempPaths = $tempPaths | Where-Object { $_ -and (Test-Path $_ -ErrorAction SilentlyContinue) } | Sort-Object -Unique

    foreach ($path in $tempPaths) {
        try {
            # Get files older than 1 hour to match clean script exactly
            $cutoffTime = (Get-Date).AddHours(-1)

            # Use -Recurse to match clean script behavior
            $files = Get-ChildItem -Path $path -Recurse -Force -ErrorAction SilentlyContinue |
                     Where-Object {
                         -not $_.PSIsContainer -and
                         $_.LastWriteTime -lt $cutoffTime -and
                         $_.Length -gt 0
                     }

            if ($files) {
                foreach ($file in $files) {
                    try {
                        $totalSize += $file.Length
                    } catch {
                        # Skip files that can't be accessed
                        continue
                    }
                }
            }
        } catch {
            # Skip paths that can't be accessed
            continue
        }
    }

    # Clean additional temp locations (match clean script exactly)
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
                    $totalSize += $item.Length
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
