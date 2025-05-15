@echo off
echo Starting WinTool in development mode (without admin elevation)...
set SKIP_ELEVATION=true
cd ..\..\..\
npx electron .
