# Kaizen Setup Guide

## Quick Start (Recommended)

Run the automated setup script:

```bash
./setup.sh
```

This will:
- ✅ Create a single virtual environment in the root directory
- ✅ Install all backend dependencies
- ✅ Install SDK in development mode
- ✅ Install frontend dependencies (if npm is available)

## Manual Setup

If you prefer to set up manually:

### 1. Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Python Dependencies

```bash
# Install backend dependencies
pip install -r backend/requirements.txt

# Install SDK in development mode (changes reflect immediately)
pip install -e sdk/
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 4. Configure Environment Variables

Create `.env` files with your API keys:

**backend/.env:**
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

**sdk/kaizen/.env:**
```bash
GEMINI_API_KEY=your_gemini_api_key
KAIZEN_BACKEND_URL=http://localhost:8000
```

## Running the Project

### Start Backend Server

```bash
source venv/bin/activate
cd backend
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

### Start Frontend Dashboard

In a new terminal:

```bash
cd frontend
npm run dev
```

The dashboard will be available at `http://localhost:5173`

### Run Demo Agent

In a new terminal:

```bash
source venv/bin/activate
cd agentDemos
python3 vulnerable_agent.py
```

This will create a workflow with 5 AI calls demonstrating all three waste types.

## Virtual Environment Strategy

**Why ONE venv?**

This project uses a single virtual environment in the root directory (`/venv`) for all Python components:

- **Backend** - FastAPI server
- **SDK** - Kaizen client library
- **Agent Demos** - Example agents

**Benefits:**
- ✅ Simpler development workflow
- ✅ No dependency conflicts
- ✅ Test SDK changes immediately in backend/demos
- ✅ Easier for new developers to get started

**Note:** The SDK can still be installed independently when users want to integrate it into their own projects. During development, we use `pip install -e sdk/` for editable installation.

## Troubleshooting

### "Command not found: uvicorn"

Make sure you've activated the virtual environment:
```bash
source venv/bin/activate
```

### "Module not found" errors

Reinstall dependencies:
```bash
source venv/bin/activate
pip install -r backend/requirements.txt
pip install -e sdk/
```

### Backend shows $0.00 for workflows

Apply the database schema changes to Supabase:
1. Open Supabase SQL Editor
2. Run the SQL from `backend/schema.sql`

Or use the migration in `Project-context.md` to add columns without deleting data.

## Project Structure

```
Kaizen/
├── venv/                      # Single virtual environment (gitignored)
├── backend/
│   ├── requirements.txt       # Backend dependencies
│   └── main.py
├── sdk/
│   ├── requirements.txt       # SDK dependencies
│   ├── setup.py              # Makes SDK installable
│   └── kaizen/
├── agentDemos/               # Demo agents using the SDK
├── frontend/                 # React dashboard
└── setup.sh                  # Automated setup script
```
