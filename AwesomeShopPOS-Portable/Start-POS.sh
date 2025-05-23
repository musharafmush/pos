#!/bin/bash
echo "🚀 Starting Awesome Shop POS Desktop App..."
echo "💰 Your professional Indian Rupee POS system is loading!"
cd "$(dirname "$0")/app"
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi
echo "✅ Starting desktop application..."
node launch-desktop-app.js