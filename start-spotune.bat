@echo off
title Spotune - Ad-Free Hi-Fi Music
color 0A
cls
echo ========================================================
echo   🎵 Spotune - Spotify-Like Ad-Free Hi-Fi Music Streamer
echo ========================================================
echo.
echo [*] Starting Spotune local server...
start /B node server\index.js > nul 2>&1

timeout /t 2 /nobreak > nul

echo [*] Opening Spotune in your browser...
start http://localhost:3000

echo.
echo [!] Spotune is running at http://localhost:3000
echo [!] Keep this window open while listening. Close it to stop.
echo.
pause
