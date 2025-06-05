@echo off
echo WinTool Simple - Starting Application
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

echo Starting WinTool Simple...
npm start

pause
