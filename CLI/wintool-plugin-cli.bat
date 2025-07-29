@echo off
REM WinTool Plugin CLI - Windows Batch Wrapper
REM This script allows running the CLI tool from anywhere on Windows

setlocal

REM Get the directory where this batch file is located
set CLI_DIR=%~dp0

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    exit /b 1
)

REM Check if the CLI script exists
if not exist "%CLI_DIR%wintool-plugin-cli.js" (
    echo Error: wintool-plugin-cli.js not found in %CLI_DIR%
    echo Please ensure the CLI tool is properly installed
    exit /b 1
)

REM Run the CLI tool with all arguments
node "%CLI_DIR%wintool-plugin-cli.js" %*

endlocal
