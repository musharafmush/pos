@echo off
REM Awesome Shop POS Desktop Installer for Windows
echo 🏗️  Installing Awesome Shop POS Desktop Application
echo 💰 Professional Indian Rupee POS System
echo.

REM Set script directory
set SCRIPT_DIR=%~dp0
set APP_DIR=%SCRIPT_DIR%app

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is required but not installed
    echo 💡 Please install Node.js from https://nodejs.org/
    echo 💡 Then run this installer again
    pause
    exit /b 1
)

echo ✅ Node.js detected
echo.

REM Check if app directory exists
if not exist "%APP_DIR%" (
    echo ❌ App directory not found: %APP_DIR%
    echo 💡 Please ensure the installer is in the correct location
    pause
    exit /b 1
)

echo 📁 App directory found: %APP_DIR%
echo.

REM Navigate to app directory and install dependencies
echo 📦 Installing application dependencies...
pushd "%APP_DIR%"
call npm install --production --silent
set INSTALL_ERROR=%errorlevel%
popd

if %INSTALL_ERROR% neq 0 (
    echo ❌ Failed to install dependencies in %APP_DIR%
    echo 💡 Please check your internet connection and try again
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully
echo.

REM Create desktop shortcut
echo 🖥️  Creating desktop shortcut...
pushd "%APP_DIR%"
node create-desktop-shortcut.cjs
popd

REM Return to installer directory
cd /d "%SCRIPT_DIR%"

echo.
echo 🎉 Installation Complete!
echo.
echo 📋 How to Launch:
echo    • Double-click the desktop shortcut "Awesome Shop POS"
echo    • Or run: AwesomeShopPOS.js
echo    • Or use: Start-Desktop-POS.bat
echo.
echo 💰 Awesome Shop POS - Ready for professional retail operations!
echo.
pause