@echo off
echo Starting WinTool in development mode...
echo.

REM Check if node_modules exists
if not exist node_modules (
    echo Node modules not found. Installing dependencies...
    call npm install
)

REM Set environment variable to skip admin elevation
set SKIP_ELEVATION=true

REM Run the electron app
echo Launching Electron app...
npx electron .
