#!/bin/bash
# Kaizen Development Environment Setup Script
# This script sets up a single virtual environment for the entire project

set -e  # Exit on error

echo "🚀 Setting up Kaizen development environment..."
echo ""

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is required but not installed."
    echo "Please install Python 3.10+ and try again."
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
echo "✓ Found Python $PYTHON_VERSION"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment already exists"
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "📦 Upgrading pip..."
pip install --upgrade pip > /dev/null 2>&1

# Install backend dependencies
echo "📦 Installing backend dependencies..."
pip install -r backend/requirements.txt

# Install SDK in development mode
echo "📦 Installing SDK in development mode..."
pip install -e sdk/

# Install frontend dependencies (if Node.js is available)
if command -v npm &> /dev/null; then
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    echo "✓ Frontend dependencies installed"
else
    echo "⚠️  npm not found, skipping frontend setup"
    echo "   Install Node.js to set up the frontend"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Copy .env.example files and add your API keys:"
echo "     - backend/.env (SUPABASE_URL, SUPABASE_KEY, GEMINI_API_KEY)"
echo "     - sdk/kaizen/.env (GEMINI_API_KEY, KAIZEN_BACKEND_URL)"
echo ""
echo "  2. Start the backend server:"
echo "     source venv/bin/activate"
echo "     cd backend && uvicorn main:app --reload"
echo ""
echo "  3. Start the frontend (in a new terminal):"
echo "     cd frontend && npm run dev"
echo ""
echo "  4. Run demo agent:"
echo "     source venv/bin/activate"
echo "     cd agentDemos && python3 vulnerable_agent.py"
echo ""
