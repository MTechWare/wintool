@echo off
echo WinTool Simple - Development Mode
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

echo Starting WinTool Simple in development mode...
echo (DevTools will be available)
npm run dev

pause
