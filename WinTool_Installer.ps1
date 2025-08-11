# Console styling functions
function Write-ColorText {
    param (
        [string]$Text,
        [string]$ForegroundColor = "White"
    )
    Write-Host $Text -ForegroundColor $ForegroundColor
}

function Write-ThemeLine {
    param (
        [string]$Text = "",
        [int]$Width = 70,
        [string]$Color = "DarkYellow"
    )
    $pad = [Math]::Max(0, [Math]::Floor(($Width - $Text.Length)/2))
    Write-ColorText ("-" * $Width) $Color
    if ($Text) {
        Write-ColorText (" " * $pad + $Text) $Color
        Write-ColorText ("-" * $Width) $Color
    }
}

function Write-ThemeMsg {
    param (
        [string]$Text,
        [int]$Width = 70,
        [string]$Color = "White"
    )
    $pad = [Math]::Max(0, [Math]::Floor(($Width - $Text.Length)/2))
    Write-ColorText (" " * $pad + $Text) $Color
}

function Write-StatusMsg {
    param (
        [string]$Text,
        [string]$Status,
        [string]$StatusColor = "Green"
    )
    Write-Host "  $Text " -NoNewline
    Write-Host "[$Status]" -ForegroundColor $StatusColor
}

function Show-Spinner {
    param (
        [int]$Milliseconds = 1500
    )
    $spinner = @('|', '/', '-', '\')
    $startTime = Get-Date
    $endTime = $startTime.AddMilliseconds($Milliseconds)

    $i = 0
    while ((Get-Date) -lt $endTime) {
        Write-Host "`r  $($spinner[$i % $spinner.Length]) Processing..." -NoNewline
        Start-Sleep -Milliseconds 80
        $i++
    }
    Write-Host "`r                           " -NoNewline
    Write-Host "`r"
}

function Show-Spinner {
    param (
        [scriptblock]$scriptBlock
    )
    $spinner = @('|', '/', '-', '\')
    $job = Start-Job -ScriptBlock $scriptBlock
    $i = 0
    while ($job.State -eq 'Running') {
        Write-Host "`r  $($spinner[$i++ % $spinner.Length]) Processing..." -NoNewline
        Start-Sleep -Milliseconds 100
    }
    Write-Host "`r"
    Receive-Job $job
}

# ======================================================================
# WinTool Installer Script
# Created by MTechWare
# Version: 1.0.2
# ======================================================================
# This script will:
#  - Check for required dependencies
#  - Create the installation directory (%LOCALAPPDATA%\MTechWare\WinTool)
#  - Download the latest WinTool application
#  - Create a desktop shortcut
#  - Launch the application
#
# Installation Directory: %LOCALAPPDATA%\MTechWare\WinTool
#  - Application executable: WinTool.exe
#  - Settings and data: config.json
#  - User plugins: Plugins\ subdirectory
# ======================================================================

# Configuration
$appName = "WinTool"
$companyName = "MTechWare"
$version = "Latest"
$installDir = "$env:LOCALAPPDATA\MTechWare\WinTool"
$exeUrl = "https://github.com/MTechWare/wintool/releases/download/release/WinTool.exe"
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "$appName.lnk"
$exePath = Join-Path $installDir "$appName.exe"

# System information
$osInfo = Get-CimInstance Win32_OperatingSystem
$osName = $osInfo.Caption
$osVersion = $osInfo.Version
$computerName = $env:COMPUTERNAME
$userName = $env:USERNAME

# Clear the console and set title
Clear-Host
$host.UI.RawUI.WindowTitle = "$appName Installer - $companyName"

# Display welcome
Write-ThemeLine "$appName Installer" -Color "DarkYellow"
Write-ThemeMsg "_      ___    ______          __" -Color "Yellow"
Write-ThemeMsg "| | /| / (_)__/_  __/__  ___  / /" -Color "Yellow"
Write-ThemeMsg "| |/ |/ / / _ \/ / / _ \/ _ \/ / " -Color "Yellow"
Write-ThemeMsg "|__/|__/_/_//_/_/  \___/\___/_/  " -Color "Yellow"
Write-ThemeMsg "by $companyName" -Color "White"
Write-ThemeLine "" -Color "DarkYellow"

# Display system information
Write-Host ""
Write-StatusMsg "System" "$osName ($osVersion)" "Yellow"
Write-StatusMsg "Computer" "$computerName" "Yellow"
Write-StatusMsg "User" "$userName" "Yellow"
Write-StatusMsg "Installing to" "$installDir" "Yellow"
Write-Host ""
Write-Host "  Note: Winget is optional but recommended for package management features." -ForegroundColor "Gray"
Write-Host ""

# Check for winget
Write-StatusMsg "Checking for winget" "PENDING" "Yellow"
$wingetInstalled = $false
try {
    $wingetVersion = winget --version 2>$null
    if ($wingetVersion -and $wingetVersion -match "v?\d+\.\d+") {
        $wingetInstalled = $true
        Write-StatusMsg "Winget version" "$wingetVersion" "Green"
    }
} catch {
    $wingetInstalled = $false
}

if (-not $wingetInstalled) {
    Write-StatusMsg "Attempting winget installation" "PROCESSING" "Yellow"
    
    try {
        # Quick attempt to install winget
        $tempDir = Join-Path $env:TEMP "WingetInstall_$(Get-Random)"
        New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
        $ProgressPreference = 'SilentlyContinue'
        
        # Download the latest winget installer
        $apiUrl = "https://api.github.com/repos/microsoft/winget-cli/releases/latest"
        $release = Invoke-RestMethod -Uri $apiUrl -UseBasicParsing
        $wingetAsset = $release.assets | Where-Object { $_.name -like "*.msixbundle" } | Select-Object -First 1
        
        if ($wingetAsset) {
            $wingetPath = Join-Path $tempDir $wingetAsset.name
            Invoke-WebRequest -Uri $wingetAsset.browser_download_url -OutFile $wingetPath -UseBasicParsing
            
            # Try to install winget
            Add-AppxPackage -Path $wingetPath -ErrorAction Stop
            
            # Clean up and verify
            Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
            $ProgressPreference = 'Continue'
            
            Start-Sleep -Seconds 2
            $wingetVersion = winget --version 2>$null
            
            if ($wingetVersion -and $wingetVersion -match "v?\d+\.\d+") {
                $wingetInstalled = $true
                Write-StatusMsg "Winget installation" "SUCCESS" "Green"
                Write-StatusMsg "Winget version" "$wingetVersion" "Green"
            } else {
                throw "Verification failed"
            }
        } else {
            throw "Installer not found"
        }
        
    } catch {
        Write-StatusMsg "Winget installation" "FAILED" "Yellow"
        Write-Host "  No worries - WinTool works great without winget!" -ForegroundColor "Gray"
        
        # Clean up on failure
        if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue }
        $ProgressPreference = 'Continue'
        $wingetInstalled = $false
    }
}

# Installation steps
Write-ThemeLine "Installation Process" -Color "DarkYellow"
Write-Host ""

# Note about winget status
if ($wingetInstalled) {
    Write-StatusMsg "Winget status" "AVAILABLE" "Green"
} else {
    Write-StatusMsg "Winget status" "NOT AVAILABLE" "Yellow"
    Write-Host "  WinTool will work without winget - package management features will be disabled." -ForegroundColor "Gray"
}
Write-Host ""

# Create install directory if it doesn't exist
Write-StatusMsg "Installation directory" "CHECKING" "Yellow"
if (!(Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
    Write-StatusMsg "Creating directory" "SUCCESS" "Green"
} else {
    Write-StatusMsg "Installation directory" "EXISTS" "Green"
}

# Download the exe file
Write-StatusMsg "Downloading $appName" "DOWNLOADING..." "Yellow"
try {
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $exeUrl -OutFile $exePath -UseBasicParsing -ErrorAction Stop
    $ProgressPreference = 'Continue'
    if (Test-Path $exePath) {
        Write-StatusMsg "Download" "COMPLETE" "Green"
    } else {
        Write-StatusMsg "Download" "FAILED" "Red"
        Write-Host "  File was not downloaded successfully." -ForegroundColor "Red"
        exit 1
    }
} catch {
    Write-StatusMsg "Download" "FAILED" "Red"
    Write-Host "  Error: $_" -ForegroundColor "Red"
    Write-Host "  Please check your internet connection or the download URL." -ForegroundColor "Red"
    exit 1
}

# Confirm the exe exists
if (!(Test-Path $exePath)) {
    Write-StatusMsg "Verification" "FAILED" "Red"
    Write-Host "  $appName.exe not found after download." -ForegroundColor "Red"
    exit 1
} else {
    Write-StatusMsg "Verification" "SUCCESS" "Green"

    # Get file information
    $fileInfo = Get-Item $exePath
    $fileSize = [math]::Round($fileInfo.Length / 1MB, 2)
    Write-StatusMsg "File size" "$fileSize MB" "Yellow"
}

# Create desktop shortcut
Write-StatusMsg "Creating shortcut" "PENDING" "Yellow"
try {
    $WScriptShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WScriptShell.CreateShortcut($shortcutPath)
    $Shortcut.TargetPath = $exePath
    $Shortcut.WorkingDirectory = $installDir
    $Shortcut.Description = "$appName - Windows Management and Tweaks by $companyName"
    $Shortcut.IconLocation = "$exePath,0"
    $Shortcut.Save()
    Write-StatusMsg "Desktop shortcut" "CREATED" "Green"
} catch {
    Write-StatusMsg "Desktop shortcut" "FAILED" "Red"
    Write-Host "  Error: $_" -ForegroundColor "Red"
}

# Installation D
Write-Host ""
Write-ThemeLine "Installation Complete" -Color "DarkYellow"
Write-Host ""
Write-ThemeMsg "$appName has been successfully installed!" -Color "Yellow"
Write-ThemeMsg "A desktop shortcut has been created" -Color "Yellow"
Write-ThemeMsg "The application will start momentarily" -Color "Yellow"
Write-Host ""

# Display helpful information
Write-ThemeLine "Helpful Information" -Color "DarkYellow"
Write-Host ""
Write-Host "  * Installation Directory: " -NoNewline -ForegroundColor "White"
Write-Host "$installDir" -ForegroundColor "Yellow"
Write-Host "  * Settings & Data: " -NoNewline -ForegroundColor "White"
Write-Host "$installDir\config.json" -ForegroundColor "Yellow"
Write-Host "  * Plugins Directory: " -NoNewline -ForegroundColor "White"
Write-Host "$installDir\Plugins" -ForegroundColor "Yellow"
Write-Host "  * Desktop Shortcut: " -NoNewline -ForegroundColor "White"
Write-Host "$shortcutPath" -ForegroundColor "Yellow"
Write-Host "  * Version: " -NoNewline -ForegroundColor "White"
Write-Host "$version" -ForegroundColor "Yellow"
Write-Host "  * Support: " -NoNewline -ForegroundColor "White"
Write-Host "https://github.com/MTechWare/wintool/issues" -ForegroundColor "Yellow"
Write-Host ""

Write-ThemeLine "Thank you for choosing $appName!" -Color "DarkYellow"
Write-Host ""
Write-ThemeMsg "Starting $appName..." -Color "Yellow"
Write-Host ""
Write-ThemeMsg "You can close this window after the application launches." -Color "White"

# Countdown before starting the app
for ($i = 1; $i -gt 0; $i--) {
    Write-Host "`rLaunching in $i..." -NoNewline -ForegroundColor "Yellow"
    Start-Sleep -Seconds 1
}
Write-Host "`rLaunching now!    " -ForegroundColor "Yellow"

# Start the app
Start-Process -FilePath $exePath
