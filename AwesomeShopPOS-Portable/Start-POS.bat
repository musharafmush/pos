@echo off
echo 🚀 Starting Awesome Shop POS Desktop App...
echo 💰 Your professional Indian Rupee POS system is loading!
cd /d "%~dp0app"
if not exist node_modules (
    echo 📦 Installing dependencies...
    npm install
)
echo ✅ Starting desktop application...
node launch-desktop-app.js
pause