@echo off
REM Startup script for Air Flute on Windows
cd /d "%~dp0"
echo =======================================================
echo   🪈 Starting Air Flute on http://localhost:8081
echo =======================================================
echo Opening your browser...

start "" "http://localhost:8081"
node server.js || python -m http.server 8081
pause
