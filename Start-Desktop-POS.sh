#!/bin/bash

# Awesome Shop POS - Desktop Application Launcher for Linux/Mac
# Professional Indian Rupee POS System

echo "🚀 Starting Awesome Shop POS Desktop Application..."
echo "💰 Professional Indian Rupee POS System"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found! Please install Node.js first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

# Display Node.js version
NODE_VERSION=$(node --version)
echo "✓ Node.js version: $NODE_VERSION"

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies for first-time setup..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

echo "✅ Dependencies ready"
echo "🔄 Launching desktop application..."
echo ""

# Set environment for desktop mode
export DESKTOP_MODE=true
export NODE_ENV=development

# Launch the desktop application
echo "🖥️  Starting professional desktop application..."
node web-desktop-app.cjs

# Check if launch was successful
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Web desktop application failed to start"
    echo "💡 Trying alternative launch method..."
    node desktop-backend/launcher.js
    if [ $? -ne 0 ]; then
        echo "💡 Trying standard web version..."
        npm run dev
    fi
fi

echo ""
echo "💰 Thank you for using Awesome Shop POS!"