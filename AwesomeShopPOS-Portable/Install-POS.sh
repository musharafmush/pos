#!/bin/bash

# Awesome Shop POS Desktop Installer for Linux/Mac
echo "🏗️  Installing Awesome Shop POS Desktop Application"
echo "💰 Professional Indian Rupee POS System"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed"
    echo "💡 Please install Node.js from https://nodejs.org/"
    echo "💡 Then run this installer again"
    exit 1
fi

echo "✅ Node.js detected"
echo ""

# Navigate to app directory
cd "$(dirname "$0")/app"

# Install dependencies
echo "📦 Installing application dependencies..."
npm install --production --silent
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"
echo ""

# Create desktop shortcut
echo "🖥️  Creating desktop shortcut..."
node create-desktop-shortcut.cjs

# Return to installer directory
cd "$(dirname "$0")"

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