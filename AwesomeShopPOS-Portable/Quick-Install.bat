@echo off
REM Quick Installer with Enhanced Error Handling
echo 🚀 Awesome Shop POS - Quick Installer
echo 💰 Professional Indian Rupee POS System
echo.

REM Get current directory
set CURRENT_DIR=%cd%
echo 📁 Current directory: %CURRENT_DIR%

REM Get script directory
set SCRIPT_DIR=%~dp0
echo 📁 Script directory: %SCRIPT_DIR%

REM Set paths
set APP_DIR=%SCRIPT_DIR%app
echo 📁 App directory: %APP_DIR%

REM Verify directories exist
if not exist "%APP_DIR%" (
    echo ❌ ERROR: App directory not found
    echo 💡 Expected: %APP_DIR%
    echo 💡 Please ensure all files were extracted correctly
    pause
    exit /b 1
)

if not exist "%APP_DIR%\package.json" (
    echo ❌ ERROR: package.json not found in app directory
    echo 💡 Please ensure all files were extracted correctly
    pause
    exit /b 1
)

echo ✅ All directories verified
echo.

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is required but not installed
    echo 💡 Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js found
echo.

REM Install dependencies
echo 📦 Installing dependencies in: %APP_DIR%
pushd "%APP_DIR%"
echo 📂 Current working directory: %cd%
call npm install --production
set INSTALL_RESULT=%errorlevel%
popd

if %INSTALL_RESULT% neq 0 (
    echo ❌ Installation failed
    echo 💡 Please check internet connection
    pause
    exit /b 1
)

echo ✅ Installation completed successfully!
echo.
echo 🎉 Ready to Launch!
echo 💡 Run: AwesomeShopPOS.js
echo.
pause