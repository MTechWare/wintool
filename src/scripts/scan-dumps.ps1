# Scan memory dumps and crash dump files
# Returns the total size in bytes of dump files that can be cleaned

try {
    $totalSize = 0
    
    # Memory dump paths
    $dumpPaths = @(
        "$env:SystemRoot\MEMORY.DMP",
        "$env:SystemRoot\Minidump\*.dmp",
        "$env:SystemRoot\LiveKernelReports\*.dmp",
        "$env:LOCALAPPDATA\CrashDumps\*.dmp",
        "$env:LOCALAPPDATA\Microsoft\Windows\WER\ReportQueue\*\*.dmp"
    )
    
    foreach ($dumpPattern in $dumpPaths) {
        try {
            if ($dumpPattern -like "*`**") {
                # Handle wildcard patterns
                $files = Get-ChildItem -Path $dumpPattern -File -Force -ErrorAction SilentlyContinue |
                         Where-Object { 
                             $_.LastWriteTime -lt (Get-Date).AddDays(-30) -and
                             $_.Length -gt 0
                         }
            } else {
                # Handle single file paths
                if (Test-Path $dumpPattern) {
                    $file = Get-Item -Path $dumpPattern -Force -ErrorAction SilentlyContinue
                    if ($file -and $file.LastWriteTime -lt (Get-Date).AddDays(-30)) {
                        $files = @($file)
                    } else {
                        $files = @()
                    }
                } else {
                    $files = @()
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
    
    # Windows Error Reporting files
    $werPaths = @(
        "$env:LOCALAPPDATA\Microsoft\Windows\WER\ReportArchive\*\*.*",
        "$env:LOCALAPPDATA\Microsoft\Windows\WER\Temp\*.*",
        "$env:ProgramData\Microsoft\Windows\WER\ReportQueue\*\*.*"
    )
    
    foreach ($werPattern in $werPaths) {
        try {
            $files = Get-ChildItem -Path $werPattern -File -Force -ErrorAction SilentlyContinue |
                     Where-Object { 
                         $_.LastWriteTime -lt (Get-Date).AddDays(-60) -and
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
    
    # Application crash dumps
    $appDumpPaths = @(
        "$env:USERPROFILE\Desktop\*.dmp",
        "$env:USERPROFILE\Documents\*.dmp"
    )
    
    foreach ($appDumpPattern in $appDumpPaths) {
        try {
            $files = Get-ChildItem -Path $appDumpPattern -File -Force -ErrorAction SilentlyContinue |
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
