@echo off
title Awesome Shop POS - Windows EXE Installer Builder
color 0A

echo.
echo ========================================
echo  Awesome Shop POS Windows EXE Builder
echo ========================================
echo.
echo Building professional Windows installer...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is available
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not available
    pause
    exit /b 1
)

echo Installing dependencies...
call npm install

echo.
echo Building application...
call npm run build

echo.
echo Creating Windows EXE installer...
node create-exe-installer.js

if errorlevel 1 (
    echo.
    echo ERROR: Failed to create Windows installer
    echo Check the error messages above
    pause
    exit /b 1
)

echo.
echo ========================================
echo  SUCCESS: Windows installer created!
echo ========================================
echo.
echo Your AwesomeShopPOS-Setup.exe file is ready in the installer-dist folder
echo You can now distribute this professional installer to Windows users
echo.
echo Features included:
echo - Professional Windows installer (NSIS)
echo - Desktop and Start Menu shortcuts
echo - Uninstaller
echo - Support for Windows 7, 8, 10, 11
echo - Both 32-bit and 64-bit versions
echo.
pause