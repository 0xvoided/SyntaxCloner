@echo off
title syntaxcloner - Created by syntax error
:: Navigate to the script's directory automatically
cd /d "%~dp0"

:check_node
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Node.js is not installed. Please install it from https://nodejs.org/
    pause
    exit
)

:start
cls
echo [!] Starting syntaxcloner...
node index.js
echo.
echo [!] Script stopped or crashed. Press any key to restart.
pause
goto start