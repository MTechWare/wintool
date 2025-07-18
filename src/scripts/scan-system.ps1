# Scan system files and calculate total size
# Returns the total size in bytes of system files that can be cleaned

try {
    $totalSize = 0
    
    # System temporary and cache paths
    $systemPaths = @(
        "$env:SystemRoot\Temp\*",
        "$env:SystemRoot\Logs\MeasuredBoot\*",
        "$env:SystemRoot\Logs\NetSetup\*",
        "$env:SystemRoot\Logs\SystemRestore\*",
        "$env:SystemRoot\Debug\*",
        "$env:SystemRoot\LiveKernelReports\*"
    )
    
    foreach ($systemPattern in $systemPaths) {
        try {
            $files = Get-ChildItem -Path $systemPattern -File -Force -ErrorAction SilentlyContinue |
                     Where-Object { 
                         $_.LastWriteTime -lt (Get-Date).AddDays(-14) -and
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
    
    # System profile cache paths
    $profilePaths = @(
        "$env:SystemRoot\System32\config\systemprofile\AppData\Local\Microsoft\Windows\INetCache\*",
        "$env:SystemRoot\ServiceProfiles\LocalService\AppData\Local\Microsoft\Windows\INetCache\*",
        "$env:SystemRoot\ServiceProfiles\NetworkService\AppData\Local\Microsoft\Windows\INetCache\*"
    )
    
    foreach ($profilePattern in $profilePaths) {
        try {
            $files = Get-ChildItem -Path $profilePattern -File -Recurse -Force -ErrorAction SilentlyContinue |
                     Where-Object { 
                         $_.LastWriteTime -lt (Get-Date).AddDays(-7) -and
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
    
    # Windows installer cache (be careful)
    $installerPaths = @(
        "$env:SystemRoot\Installer\`$PatchCache`$\*\*.msp",
        "$env:SystemRoot\SoftwareDistribution\Download\*"
    )
    
    foreach ($installerPattern in $installerPaths) {
        try {
            $files = Get-ChildItem -Path $installerPattern -File -Force -ErrorAction SilentlyContinue |
                     Where-Object { 
                         $_.LastWriteTime -lt (Get-Date).AddDays(-30) -and
                         $_.Length -gt 10MB
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
