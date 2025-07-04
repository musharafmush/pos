#!/bin/bash

# Awesome Shop POS - Cross-Platform Installer Builder
# Creates professional installers for Windows, Linux, and macOS

set -e

echo "🚀 Building Cross-Platform Installers for Awesome Shop POS"
echo "=========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

echo -e "${BLUE}🔨 Building application...${NC}"
npm run build

# Create platform-specific builds
echo -e "${YELLOW}🏗️  Creating platform-specific installers...${NC}"

# Windows
echo -e "${BLUE}🪟 Building Windows installer...${NC}"
if node create-exe-installer.js; then
    echo -e "${GREEN}✅ Windows installer created successfully${NC}"
else
    echo -e "${RED}❌ Failed to create Windows installer${NC}"
fi

# Linux AppImage (if on Linux)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo -e "${BLUE}🐧 Building Linux AppImage...${NC}"
    if npx electron-builder --linux --publish=never; then
        echo -e "${GREEN}✅ Linux AppImage created successfully${NC}"
    else
        echo -e "${RED}❌ Failed to create Linux AppImage${NC}"
    fi
fi

# macOS DMG (if on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "${BLUE}🍎 Building macOS DMG...${NC}"
    if npx electron-builder --mac --publish=never; then
        echo -e "${GREEN}✅ macOS DMG created successfully${NC}"
    else
        echo -e "${RED}❌ Failed to create macOS DMG${NC}"
    fi
fi

echo ""
echo -e "${GREEN}🎉 Build process completed!${NC}"
echo ""
echo -e "${YELLOW}📁 Your installers are available in:${NC}"
echo "   • installer-dist/ (Windows EXE)"
echo "   • dist/ (Linux AppImage, macOS DMG)"
echo ""
echo -e "${BLUE}📦 Installer Features:${NC}"
echo "   • Professional Windows NSIS installer"
echo "   • Linux AppImage (portable)"
echo "   • macOS DMG with drag-to-Applications"
echo "   • Desktop shortcuts"
echo "   • Start menu integration"
echo "   • Clean uninstallation"
echo "   • Auto-updater support"
echo ""
echo -e "${GREEN}✨ Ready for distribution!${NC}"