@echo off
REM Startup script for GestureChords on Windows
cd /d "%~dp0"
echo =======================================================
echo   🎵 Starting GestureChords on http://localhost:8080
echo =======================================================
echo Opening your browser...

start "" "http://localhost:8080"
python -m http.server 8080 || python3 -m http.server 8080 || node server.js
pause
