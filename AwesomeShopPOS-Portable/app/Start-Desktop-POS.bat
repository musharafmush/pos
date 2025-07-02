@echo off
title Awesome Shop POS - Desktop Application
echo 🚀 Starting Awesome Shop POS Desktop Application...
echo 💰 Professional Indian Rupee POS System
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found! Please install Node.js first.
    echo    Download from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm dependencies are installed
if not exist "node_modules" (
    echo 📦 Installing dependencies for first-time setup...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

echo ✅ Dependencies ready
echo 🔄 Launching desktop application...
echo.

REM Set environment for desktop mode
set DESKTOP_MODE=true
set NODE_ENV=development

REM Launch the desktop application
echo 🖥️  Starting professional desktop application...
node web-desktop-app.cjs

if %errorlevel% neq 0 (
    echo.
    echo ❌ Web desktop application failed to start
    echo 💡 Trying alternative launch method...
    node desktop-backend/launcher.js
    if %errorlevel% neq 0 (
        echo 💡 Trying standard web version...
        call npm run dev
    )
)

echo.
echo 💰 Thank you for using Awesome Shop POS!
pause