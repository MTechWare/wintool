# Clean system files and temporary data

try {
    # Initialize counters
    $filesRemoved = 0
    $totalSizeFreed = 0
    $ErrorActionPreference = "SilentlyContinue"

    # 1. Clean Windows Update Cache
    $updateCachePath = "$env:SystemRoot\SoftwareDistribution\Download"
    if (Test-Path $updateCachePath -ErrorAction SilentlyContinue) {
        try {
            $files = Get-ChildItem -Path $updateCachePath -Recurse -Force -ErrorAction SilentlyContinue |
                     Where-Object { -not $_.PSIsContainer -and $_.Length -gt 0 }

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
            # Skip if Windows Update cache is not accessible
        }
    }

    # 2. Clean Windows Error Reporting
    $werPaths = @(
        "$env:ProgramData\Microsoft\Windows\WER\ReportQueue",
        "$env:ProgramData\Microsoft\Windows\WER\ReportArchive",
        "$env:LOCALAPPDATA\Microsoft\Windows\WER\ReportQueue",
        "$env:LOCALAPPDATA\Microsoft\Windows\WER\ReportArchive"
    )

    foreach ($werPath in $werPaths) {
        if (Test-Path $werPath -ErrorAction SilentlyContinue) {
            try {
                $files = Get-ChildItem -Path $werPath -Recurse -Force -ErrorAction SilentlyContinue |
                         Where-Object { -not $_.PSIsContainer -and $_.Length -gt 0 }

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

    # 3. Clean System Log Files (older than 7 days)
    $logPaths = @(
        "$env:SystemRoot\Logs\CBS",
        "$env:SystemRoot\Logs\DISM",
        "$env:SystemRoot\Logs\MoSetup",
        "$env:SystemRoot\Logs\WindowsUpdate",
        "$env:SystemRoot\Panther",
        "$env:SystemRoot\Logs\SIH",
        "$env:SystemRoot\Logs\waasmedic"
    )

    foreach ($logPath in $logPaths) {
        if (Test-Path $logPath -ErrorAction SilentlyContinue) {
            try {
                $files = Get-ChildItem -Path $logPath -Recurse -Force -ErrorAction SilentlyContinue |
                         Where-Object {
                             -not $_.PSIsContainer -and
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
    }

    # 4. Clean Memory Dump Files
    $dumpPaths = @("$env:SystemRoot\Minidump", "$env:SystemRoot\MEMORY.DMP")
    foreach ($dumpPath in $dumpPaths) {
        if (Test-Path $dumpPath -ErrorAction SilentlyContinue) {
            try {
                $item = Get-Item -Path $dumpPath -ErrorAction Stop

                if ($item.PSIsContainer) {
                    # Directory with dump files
                    $files = Get-ChildItem -Path $dumpPath -Force -ErrorAction SilentlyContinue |
                             Where-Object { -not $_.PSIsContainer -and $_.Length -gt 0 }

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
                } else {
                    # Single file (MEMORY.DMP)
                    try {
                        $fileSize = $item.Length
                        Remove-Item -Path $dumpPath -Force -ErrorAction Stop
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

    # 5. Clean Windows Installer Cache (old MSI files - be careful)
    $msiCachePath = "$env:SystemRoot\Installer"
    if (Test-Path $msiCachePath -ErrorAction SilentlyContinue) {
        try {
            # Only remove very old MSI files (older than 60 days) to avoid breaking installations
            $files = Get-ChildItem -Path $msiCachePath -Filter "*.msi" -Force -ErrorAction SilentlyContinue |
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
            # Skip if Windows Installer cache is not accessible
        }
    }

    # 6. Clean additional system locations
    $additionalPaths = @(
        "$env:SystemRoot\Logs\MeasuredBoot\*",
        "$env:SystemRoot\Logs\NetSetup\*",
        "$env:SystemRoot\Logs\SystemRestore\*",
        "$env:SystemRoot\Debug\*",
        "$env:SystemRoot\LiveKernelReports\*"
    )

    foreach ($pathPattern in $additionalPaths) {
        try {
            $files = Get-ChildItem -Path $pathPattern -Force -ErrorAction SilentlyContinue |
                     Where-Object {
                         -not $_.PSIsContainer -and
                         $_.LastWriteTime -lt (Get-Date).AddDays(-14) -and
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



    # Output result as JSON
    $result = @{
        filesRemoved = $filesRemoved
        sizeFreed = $totalSizeFreed
        category = "system"
        timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    }

    $result | ConvertTo-Json -Compress

} catch {
    # Return error in JSON format
    @{
        filesRemoved = 0
        sizeFreed = 0
        category = "system"
        error = $_.Exception.Message
        timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    } | ConvertTo-Json -Compress
}
