#!/bin/bash

# Order Management System - Frontend Startup Script
echo "🚀 Starting React Frontend Server..."
echo "=================================="

# Navigate to frontend directory
cd "$(dirname "$0")/frontend" || exit

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies (first time only)..."
    npm install
fi

# Start React development server
echo "✅ Starting React server on http://localhost:3000"
echo "   Press Ctrl+C to stop the server"
echo "   Browser will open automatically"
echo "=================================="
npm start

