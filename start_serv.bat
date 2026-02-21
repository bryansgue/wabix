@echo off
title WhatsApp AI Bot Launcher
cd /d "%~dp0"

echo ==========================================
echo    WhatsApp AI Bot - Auto Launcher
echo ==========================================

REM Check deps
if not exist "node_modules" (
    echo [INFO] Primera vez detectada. Instalando dependencias...
    call npm run install:all
)

echo.
echo [INFO] Iniciando Servidores en ventanas separadas...
echo.

REM Start Backend
start "WhatsApp Bot SERVER (Backend)" cmd /k "cd server && npm run dev"

REM Start Frontend
start "WhatsApp Bot DASHBOARD (Frontend)" cmd /k "cd client && npm run dev"

echo [SUCCESS] Ventanas iniciadas.
echo.
echo    - Backend:  Esperando conexion...
echo    - Frontend: Abriendo en http://localhost:5173
echo.
echo No cierres las otras ventanas negras que se han abierto.
pause
