# PowerShell script to download LibreHardwareMonitor DLL
$ErrorActionPreference = "Stop"

# Define the URL for the latest release of LibreHardwareMonitor
$releaseUrl = "https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/releases/latest"

# Define the destination directory
$libDir = Join-Path -Path $PSScriptRoot -ChildPath "..\..\js\lib"

# Create the lib directory if it doesn't exist
if (-not (Test-Path $libDir)) {
    Write-Host "Creating directory: $libDir"
    New-Item -Path $libDir -ItemType Directory -Force | Out-Null
}

# Function to download and extract the DLL
function Download-LibreHardwareMonitor {
    try {
        # Get the latest release page
        Write-Host "Getting latest release information..."
        $request = [System.Net.WebRequest]::Create($releaseUrl)
        $request.AllowAutoRedirect = $false
        $response = $request.GetResponse()

        # Get the redirect URL which contains the latest version
        $latestReleaseUrl = $response.GetResponseHeader("Location")
        $response.Close()

        # Extract the version from the URL
        $version = $latestReleaseUrl.Split("/")[-1]
        Write-Host "Latest version: $version"

        # Construct the download URL
        $downloadUrl = "https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/releases/download/$version/LibreHardwareMonitor-net472.zip"
        Write-Host "Download URL: $downloadUrl"

        # Download the zip file
        $zipPath = Join-Path -Path $env:TEMP -ChildPath "LibreHardwareMonitor.zip"
        Write-Host "Downloading to: $zipPath"
        Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath

        # Extract the zip file
        $extractPath = Join-Path -Path $env:TEMP -ChildPath "LibreHardwareMonitor"
        Write-Host "Extracting to: $extractPath"
        if (Test-Path $extractPath) {
            Remove-Item -Path $extractPath -Recurse -Force
        }
        Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force

        # Copy the DLL to the lib directory
        $dllPath = Join-Path -Path $extractPath -ChildPath "LibreHardwareMonitorLib.dll"
        $destPath = Join-Path -Path $libDir -ChildPath "LibreHardwareMonitorLib.dll"
        Write-Host "Copying DLL to: $destPath"
        Copy-Item -Path $dllPath -Destination $destPath -Force

        # Clean up
        Write-Host "Cleaning up temporary files..."
        Remove-Item -Path $zipPath -Force
        Remove-Item -Path $extractPath -Recurse -Force

        Write-Host "LibreHardwareMonitor DLL downloaded and installed successfully!"
        return $true
    }
    catch {
        Write-Host "Error downloading LibreHardwareMonitor: $_"
        return $false
    }
}

# Main execution
Write-Host "Starting LibreHardwareMonitor download..."
$result = Download-LibreHardwareMonitor

if ($result) {
    Write-Host "LibreHardwareMonitor setup completed successfully."
    exit 0
} else {
    Write-Host "Failed to set up LibreHardwareMonitor."
    exit 1
}
