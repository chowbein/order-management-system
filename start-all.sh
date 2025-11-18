#!/bin/bash

# Order Management System - Start Both Servers
echo "🚀 Starting Order Management System..."
echo "=================================="

# Get the directory where this script is located
DIR="$(cd "$(dirname "$0")" && pwd)"

# Check if running on macOS (which has 'open' command)
if command -v osascript &> /dev/null; then
    echo "📱 Opening terminals for backend and frontend..."
    
    # Open new terminal for backend
    osascript -e "tell application \"Terminal\"
        do script \"cd '$DIR' && ./start-backend.sh\"
        activate
    end tell"
    
    sleep 2
    
    # Open new terminal for frontend
    osascript -e "tell application \"Terminal\"
        do script \"cd '$DIR' && ./start-frontend.sh\"
    end tell"
    
    echo "✅ Both servers are starting in separate terminal windows"
    echo "   Backend: http://localhost:8000"
    echo "   Frontend: http://localhost:3000"
    echo ""
    echo "   To stop the servers, press Ctrl+C in each terminal window"
    
else
    # For Linux or if osascript is not available
    echo "⚠️  Automatic terminal opening is only supported on macOS"
    echo ""
    echo "Please run these commands in separate terminal windows:"
    echo ""
    echo "Terminal 1: ./start-backend.sh"
    echo "Terminal 2: ./start-frontend.sh"
fi

