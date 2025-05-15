@echo off
echo Starting WinTool...

:: Get the directory of this batch file
set "BATCH_DIR=%~dp0"
cd /d "%BATCH_DIR%"

:: Check if we're in development or production mode
if exist "%BATCH_DIR%\node_modules\electron\dist\electron.exe" (
    :: Development mode - use local electron
    echo Running in development mode
    start "" "%BATCH_DIR%\node_modules\electron\dist\electron.exe" "%BATCH_DIR%"
) else if exist "%BATCH_DIR%\electron.exe" (
    :: Production mode - use electron in app directory
    echo Running in production mode
    start "" "%BATCH_DIR%\electron.exe" "%BATCH_DIR%"
) else if exist "%BATCH_DIR%\wintool.exe" (
    :: Packaged mode
    echo Running packaged application
    start "" "%BATCH_DIR%\wintool.exe"
) else (
    :: Fallback - try to find electron in PATH
    echo Running in fallback mode
    start "" electron "%BATCH_DIR%"
)

:: Exit the batch file
exit
