#!/bin/bash

# Order Management System - Backend Startup Script
echo "🚀 Starting Django Backend Server..."
echo "=================================="

# Navigate to backend directory
cd "$(dirname "$0")/backend" || exit

# Set up and activate virtual environment
if [ ! -d "venv" ]; then
    echo "🐍 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "📦 Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "pip installing requirements..."
pip install -r requirements.txt

# Check if migrations need to be applied
echo "🔄 Checking for pending migrations..."
python manage.py migrate --check 2>/dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  Applying pending migrations..."
    python manage.py migrate
fi

# Start Django development server
echo "✅ Starting Django server on http://localhost:8000"
echo "   Press Ctrl+C to stop the server"
echo "=================================="
python manage.py runserver

