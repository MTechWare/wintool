# Clean memory dumps and crash dump files
# Returns JSON with cleanup statistics

try {
    $filesRemoved = 0
    $totalSizeFreed = 0
    

    $dumpPaths = @(
        "$env:SystemRoot\Minidump\*.dmp",
        "$env:LOCALAPPDATA\CrashDumps\*.dmp"
    )
    
    foreach ($dumpPattern in $dumpPaths) {
        try {
            $files = Get-ChildItem -Path $dumpPattern -File -Force -ErrorAction SilentlyContinue |
                     Where-Object {
                         $_.LastWriteTime -lt (Get-Date).AddDays(-7) -and
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
    

    $werPaths = @(
        "$env:LOCALAPPDATA\Microsoft\Windows\WER\ReportArchive\*\*.*",
        "$env:LOCALAPPDATA\Microsoft\Windows\WER\Temp\*.*"
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
    

    $result = @{
        timestamp = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        sizeFreed = $totalSizeFreed
        filesRemoved = $filesRemoved
        category = "dumps"
    }
    
    Write-Output ($result | ConvertTo-Json -Compress)
    
} catch {
    # If anything fails, output minimal result
    $result = @{
        timestamp = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        sizeFreed = 0
        filesRemoved = 0
        category = "dumps"
    }
    Write-Output ($result | ConvertTo-Json -Compress)
}
