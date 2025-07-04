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

# ======================================================================
# WinTool Installer Script
# Created by MTechWare
# Version: 1.0.0
# ======================================================================
# This script will:
#  - Check for required dependencies
#  - Create the installation directory
#  - Download the latest WinTool application
#  - Create a desktop shortcut
#  - Launch the application
# ======================================================================

# Configuration
$appName = "WinTool"
$companyName = "MTechWare"
$version = "0.0.8w"
$installDir = "$env:LOCALAPPDATA\MTechTool"
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

# Display welcome banner
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

# Check for winget
Write-StatusMsg "Checking for winget" "PENDING" "Yellow"
$wingetInstalled = $false
try {
    $wingetVersion = winget --version 2>&1
    if ($wingetVersion -match "\d+\.\d+\.\d+") {
        $wingetInstalled = $true
        Write-StatusMsg "Winget version" "$wingetVersion" "Green"
    }
} catch {
    $wingetInstalled = $false
}

if (-not $wingetInstalled) {
    Write-StatusMsg "Installing winget" "PENDING" "Yellow"
    $appInstallerUrl = "https://aka.ms/getwinget"
    $appInstallerPath = Join-Path $env:TEMP "AppInstaller.msixbundle"

    try {
        Show-Spinner
        Invoke-WebRequest -Uri $appInstallerUrl -OutFile $appInstallerPath -UseBasicParsing -ErrorAction Stop
        Add-AppxPackage -Path $appInstallerPath
        Remove-Item $appInstallerPath -Force

        # Re-check winget
        $wingetVersion = winget --version 2>&1
        if ($wingetVersion -match "\d+\.\d+\.\d+") {
            $wingetInstalled = $true
            Write-StatusMsg "Winget installation" "SUCCESS" "Green"
        } else {
            Write-StatusMsg "Winget installation" "FAILED" "Red"
            Write-Host "  Please install 'App Installer' from the Microsoft Store manually and re-run this installer." -ForegroundColor "Red"
            exit 1
        }
    } catch {
        Write-StatusMsg "Winget installation" "FAILED" "Red"
        Write-Host "  Error: $_" -ForegroundColor "Red"
        Write-Host "  Please install 'App Installer' from the Microsoft Store manually and re-run this installer." -ForegroundColor "Red"
        exit 1
    }
}

# Installation steps
Write-ThemeLine "Installation Process" -Color "DarkYellow"
Write-Host ""

# Create install directory if it doesn't exist
Write-StatusMsg "Installation directory" "CHECKING" "Yellow"
if (!(Test-Path $installDir)) {
    Show-Spinner -Milliseconds 800
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
    Write-StatusMsg "Creating directory" "SUCCESS" "Green"
} else {
    Write-StatusMsg "Installation directory" "EXISTS" "Green"
}

# Download the exe file
Write-StatusMsg "Downloading $appName" "PENDING" "Yellow"
try {
    # Show a simple spinner while downloading
    $job = Start-Job -ScriptBlock {
        param($url, $path)
        Invoke-WebRequest -Uri $url -OutFile $path -UseBasicParsing
    } -ArgumentList $exeUrl, $exePath

    # Wait for download with a spinner
    while ($job.State -eq "Running") {
        Show-Spinner -Milliseconds 500
    }

    # Check job status
    Receive-Job -Job $job -ErrorAction Stop
    Remove-Job -Job $job

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
    Show-Spinner -Milliseconds 1000
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

# Installation complete
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
for ($i = 3; $i -gt 0; $i--) {
    Write-Host "`rLaunching in $i..." -NoNewline -ForegroundColor "Yellow"
    Start-Sleep -Seconds 1
}
Write-Host "`rLaunching now!    " -ForegroundColor "Yellow"

# Start the app
Start-Process -FilePath $exePath
