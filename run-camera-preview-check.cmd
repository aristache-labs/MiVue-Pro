@echo off
setlocal
cd /d "%~dp0"

echo This check talks only to the camera at 192.72.1.1.
echo It is read-only, sequential, and uses one attempt per request.
echo.

call node_modules\.bin\tsx.cmd scripts\camera-preview-readonly-check.ts
set "laneory_exit_code=%ERRORLEVEL%"

echo.
echo Reconnect to the internet, then send Codex the generated JSON from Downloads.
echo.
pause
exit /b %laneory_exit_code%
