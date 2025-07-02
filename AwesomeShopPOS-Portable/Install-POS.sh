#!/bin/bash

# Awesome Shop POS Desktop Installer for Linux/Mac
echo "🏗️  Installing Awesome Shop POS Desktop Application"
echo "💰 Professional Indian Rupee POS System"
echo ""

# Set script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR/app"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed"
    echo "💡 Please install Node.js from https://nodejs.org/"
    echo "💡 Then run this installer again"
    exit 1
fi

echo "✅ Node.js detected"
echo ""

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
    echo "❌ App directory not found: $APP_DIR"
    echo "💡 Please ensure the installer is in the correct location"
    exit 1
fi

echo "📁 App directory found: $APP_DIR"
echo ""

# Navigate to app directory and install dependencies
echo "📦 Installing application dependencies..."
cd "$APP_DIR"
npm install --production --silent
INSTALL_ERROR=$?

if [ $INSTALL_ERROR -ne 0 ]; then
    echo "❌ Failed to install dependencies in $APP_DIR"
    echo "💡 Please check your internet connection and try again"
    exit 1
fi

echo "✅ Dependencies installed successfully"
echo ""

# Create desktop shortcut
echo "🖥️  Creating desktop shortcut..."
node create-desktop-shortcut.cjs

# Return to installer directory
cd "$SCRIPT_DIR"

# Make launcher executable
chmod +x AwesomeShopPOS.js

echo ""
echo "🎉 Installation Complete!"
echo ""
echo "📋 How to Launch:"
echo "   • Double-click the desktop shortcut 'Awesome Shop POS'"
echo "   • Or run: ./AwesomeShopPOS.js"
echo "   • Or use: ./Start-Desktop-POS.sh"
echo ""
echo "💰 Awesome Shop POS - Ready for professional retail operations!"
echo ""