function Write-ThemeLine($text, $width=60) {
    $pad = [Math]::Max(0, [Math]::Floor(($width - $text.Length)/2))
    Write-Host ("=" * $width)
    Write-Host (" " * $pad + $text)
    Write-Host ("=" * $width)
}

function Write-ThemeMsg($text, $width=60) {
    $pad = [Math]::Max(0, [Math]::Floor(($width - $text.Length)/2))
    Write-Host (" " * $pad + $text)
}

# WinTool Installer Script
# This script will create the install directory, download the app exe, and create a desktop shortcut.

$installDir = "$env:LOCALAPPDATA\MTechTool"
$exeUrl = "https://github.com/MTechWare/wintool/releases/download/release/WinTool.exe"
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "WinTool.lnk"
$exePath = Join-Path $installDir "WinTool.exe"

# Check for winget
Write-ThemeMsg "Checking for winget (Windows Package Manager)..."
$wingetInstalled = $false
try {
    $wingetVersion = winget --version 2>&1
    if ($wingetVersion -match "\d+\.\d+\.\d+") {
        $wingetInstalled = $true
        Write-ThemeMsg "winget is installed: $wingetVersion"
    }
} catch {
    $wingetInstalled = $false
}
if (-not $wingetInstalled) {
    Write-ThemeMsg "winget is not installed. Attempting to install App Installer from Microsoft..."
    $appInstallerUrl = "https://aka.ms/getwinget"
    $appInstallerPath = Join-Path $env:TEMP "AppInstaller.msixbundle"
    try {
        Invoke-WebRequest -Uri $appInstallerUrl -OutFile $appInstallerPath -UseBasicParsing -ErrorAction Stop
        Add-AppxPackage -Path $appInstallerPath
        Remove-Item $appInstallerPath -Force
        # Re-check winget
        $wingetVersion = winget --version 2>&1
        if ($wingetVersion -match "\d+\.\d+\.\d+") {
            $wingetInstalled = $true
            Write-ThemeMsg "winget installed successfully: $wingetVersion"
        } else {
            Write-ThemeMsg "ERROR: winget installation failed. Please install 'App Installer' from the Microsoft Store manually and re-run this installer."
            exit 1
        }
    } catch {
        Write-ThemeMsg "ERROR: winget installation failed. Please install 'App Installer' from the Microsoft Store manually and re-run this installer."
        exit 1
    }
}

# [PYTHON CHECK REMOVED - No longer required]

Write-ThemeLine "WinTool Installer"
Write-ThemeMsg "_      ___    ______          __"
Write-ThemeMsg "| | /| / (_)__/_  __/__  ___  / /"
Write-ThemeMsg "| |/ |/ / / _ \/ / / _ \/ _ \/ / "
Write-ThemeMsg "|__/|__/_/_//_/_/  \___/\___/_/  "
Write-ThemeLine ""
Write-ThemeMsg "Thank you for choosing WinTool!"
Write-ThemeMsg "Installer will guide you through setup."
Start-Sleep -Milliseconds 700

# Create install directory if it doesn't exist
if (!(Test-Path $installDir)) {
    Write-ThemeMsg "Creating installation directory..."
    New-Item -ItemType Directory -Path $installDir | Out-Null
    Start-Sleep -Milliseconds 400
}

# Download the exe file
Write-ThemeMsg "Downloading WinTool... (This Might Take Bit)"
try {
    Invoke-WebRequest -Uri $exeUrl -OutFile $exePath -ErrorAction Stop
    Write-ThemeMsg "Download complete!"
} catch {
    Write-ThemeMsg "ERROR: Download failed. Please check your internet connection or the download URL."
    exit 1
}
Start-Sleep -Milliseconds 400

# Confirm the exe exists
if (!(Test-Path $exePath)) {
    Write-ThemeMsg "ERROR: WinTool.exe not found after download."
    exit 1
}

Write-ThemeMsg "Creating desktop shortcut..."
$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = $exePath
$Shortcut.WorkingDirectory = $installDir
$Shortcut.IconLocation = "$exePath,0"
$Shortcut.Save()
Write-ThemeMsg "Shortcut created!"

Write-ThemeLine "WinTool is installed."
Write-ThemeLine "You can now close this window."

Start-Sleep -Milliseconds 800

# Optionally, start the app automatically
Start-Process -FilePath $exePath
