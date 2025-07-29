# WinTool Plugin CLI Installation Script
# This script installs the WinTool Plugin CLI tool globally

param(
    [switch]$Force,
    [switch]$Local,
    [string]$InstallPath = ""
)

Write-Host "🔧 WinTool Plugin CLI Installer" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Check if Node.js is installed
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
    } else {
        throw "Node.js not found"
    }
} catch {
    Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if npm is available
try {
    $npmVersion = npm --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ npm found: $npmVersion" -ForegroundColor Green
    } else {
        throw "npm not found"
    }
} catch {
    Write-Host "❌ npm is not available" -ForegroundColor Red
    exit 1
}

# Get current directory
$currentDir = Get-Location
$cliDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "📁 CLI Directory: $cliDir" -ForegroundColor Blue

# Change to CLI directory
Set-Location $cliDir

# Check if package.json exists
if (-not (Test-Path "package.json")) {
    Write-Host "❌ package.json not found in CLI directory" -ForegroundColor Red
    Set-Location $currentDir
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
try {
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed"
    }
    Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    Set-Location $currentDir
    exit 1
}

# Install globally or locally
if ($Local) {
    Write-Host "📍 Local installation completed" -ForegroundColor Green
    Write-Host "To use the CLI, run: node wintool-plugin-cli.js <command>" -ForegroundColor Yellow
} else {
    Write-Host "🌐 Installing globally..." -ForegroundColor Yellow
    
    try {
        if ($Force) {
            npm install -g . --force
        } else {
            npm install -g .
        }
        
        if ($LASTEXITCODE -ne 0) {
            throw "Global installation failed"
        }
        
        Write-Host "✅ Global installation completed" -ForegroundColor Green
        Write-Host "You can now use 'wintool-plugin-cli' from anywhere" -ForegroundColor Yellow
    } catch {
        Write-Host "❌ Global installation failed" -ForegroundColor Red
        Write-Host "Try running as Administrator or use -Local flag" -ForegroundColor Yellow
        Set-Location $currentDir
        exit 1
    }
}

# Add to PATH if batch file exists
$batchFile = Join-Path $cliDir "wintool-plugin-cli.bat"
if (Test-Path $batchFile) {
    Write-Host "📝 Batch wrapper found: $batchFile" -ForegroundColor Blue
    
    if (-not $Local) {
        # Check if CLI directory is in PATH
        $pathDirs = $env:PATH -split ";"
        if ($pathDirs -notcontains $cliDir) {
            Write-Host "💡 Consider adding $cliDir to your PATH for easier access" -ForegroundColor Yellow
        }
    }
}

# Test installation
Write-Host "🧪 Testing installation..." -ForegroundColor Yellow
try {
    if ($Local) {
        $testOutput = node "wintool-plugin-cli.js" version 2>$null
    } else {
        $testOutput = wintool-plugin-cli version 2>$null
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Installation test passed" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Installation test failed, but CLI may still work" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Could not test installation" -ForegroundColor Yellow
}

# Show usage information
Write-Host ""
Write-Host "🎉 Installation completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Usage:" -ForegroundColor Cyan
if ($Local) {
    Write-Host "  node wintool-plugin-cli.js create my-plugin" -ForegroundColor White
    Write-Host "  node wintool-plugin-cli.js validate ./my-plugin" -ForegroundColor White
    Write-Host "  node wintool-plugin-cli.js help" -ForegroundColor White
} else {
    Write-Host "  wintool-plugin-cli create my-plugin" -ForegroundColor White
    Write-Host "  wintool-plugin-cli validate ./my-plugin" -ForegroundColor White
    Write-Host "  wintool-plugin-cli help" -ForegroundColor White
}
Write-Host ""
Write-Host "For more information, see README.md" -ForegroundColor Blue

# Return to original directory
Set-Location $currentDir

Write-Host "✨ Ready to develop WinTool plugins!" -ForegroundColor Green
