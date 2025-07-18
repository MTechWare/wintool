# Scan Windows Update cache and temporary files
# Returns the total size in bytes of update files that can be cleaned

try {
    $totalSize = 0
    
    # Windows Update cache paths
    $updatePaths = @(
        "$env:SystemRoot\SoftwareDistribution\Download",
        "$env:SystemRoot\SoftwareDistribution\DataStore\Logs",
        "$env:SystemRoot\WindowsUpdate.log*",
        "$env:LOCALAPPDATA\Microsoft\Windows\WindowsUpdate.log*"
    )
    
    foreach ($updatePath in $updatePaths) {
        try {
            # Handle wildcard paths
            if ($updatePath -like "*`**") {
                $files = Get-ChildItem -Path $updatePath -File -Force -ErrorAction SilentlyContinue |
                         Where-Object { 
                             $_.LastWriteTime -lt (Get-Date).AddDays(-7) -and
                             $_.Length -gt 0
                         }
            } else {
                if (Test-Path $updatePath) {
                    try {
                        $files = Get-ChildItem -Path $updatePath -File -Recurse -Force -ErrorAction SilentlyContinue |
                                 Where-Object { 
                                     $_.LastWriteTime -lt (Get-Date).AddDays(-7) -and
                                     $_.Length -gt 0
                                 }
                    } catch {
                        continue
                    }
                } else {
                    continue
                }
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
    
    # Additional update-related locations
    $additionalPaths = @(
        "$env:SystemRoot\Logs\CBS\*.log",
        "$env:SystemRoot\Logs\DISM\*.log",
        "$env:SystemRoot\Logs\WindowsUpdate\*.etl"
    )
    
    foreach ($pattern in $additionalPaths) {
        try {
            $files = Get-ChildItem -Path $pattern -File -Force -ErrorAction SilentlyContinue |
                     Where-Object { 
                         $_.LastWriteTime -lt (Get-Date).AddDays(-14) -and
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
