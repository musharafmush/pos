@echo off
REM Awesome Shop POS Desktop Installer for Windows
echo 🏗️  Installing Awesome Shop POS Desktop Application
echo 💰 Professional Indian Rupee POS System
echo.

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

REM Navigate to app directory
cd /d "%~dp0\app"

REM Install dependencies
echo 📦 Installing application dependencies...
call npm install --production --silent
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully
echo.

REM Create desktop shortcut
echo 🖥️  Creating desktop shortcut...
node create-desktop-shortcut.cjs

REM Return to installer directory
cd /d "%~dp0"

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