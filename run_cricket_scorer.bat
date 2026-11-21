@echo off
title CrickPro Cricket Scorer
echo ========================================================
echo   Starting CrickPro Manual Cricket Scoring System...
echo ========================================================

cd /d "%~dp0backend"
start "" /b py -m uvicorn main:app --host 0.0.0.0 --port 8000

timeout /t 3 /nobreak >nul

if exist "C:\Program Files (x86)\cloudflared\cloudflared.exe" (
    echo Starting Online Public Tunnel...
    start "" /b "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:8000
)

start http://localhost:8000
echo.
echo CrickPro is running!
echo Access locally: http://localhost:8000
echo Access on Wi-Fi: http://192.168.1.13:8000
echo.
