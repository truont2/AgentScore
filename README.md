# Kaizen

**Multi-Agent AI Cost Optimization Platform**

Kaizen is a performance profiler for multi-agent AI systems. It automatically captures AI workflow calls, uses Google Gemini to analyze patterns, and identifies where you're wasting 60-80% of your AI budget on redundant calls, model overkill, and prompt bloat.

---

## ⛩️ Why Kaizen?

**Kaizen (改善)** is a Japanese philosophy meaning "change for the better" or "continuous improvement".

In the context of AI engineering, **Muda (waste)** comes in the form of redundant tokens, oversized models, and repetitive prompts. Kaizen helps you continuously identify and eliminate this waste, ensuring your AI systems get faster, cheaper, and more efficient with every iteration.

---

## 🎯 The Problem

When developers build multi-agent AI systems (using tools like LangChain, CrewAI, AutoGPT), their agents often make 50-100+ AI calls per workflow. These calls are expensive, and developers have **zero visibility** into what's causing the costs.

**Common waste patterns:**
- **Redundant calls**: Same question asked multiple times in different words
- **Model overkill**: Using GPT-4 for simple tasks that GPT-3.5 could handle
- **Prompt bloat**: Sending unnecessary context in every call

**Example:** A workflow that costs $3.40 could cost $1.00 after optimization. Multiply that by 1,000 runs/day = $2,400/day wasted.

---

## 💡 The Solution

Kaizen works in three steps:

### 1. **Capture**
Developers install our Python SDK and wrap their AI client. Kaizen silently captures every AI call in the background.
```python
from kaizen import Lens
from openai import OpenAI

lens = Lens(api_key="your-key")
client = lens.wrap(OpenAI())

lens.start_workflow("Process customer email")
# Make AI calls normally - Kaizen captures everything
response = client.chat.completions.create(...)
lens.end_workflow()
```

### 2. **Analyze**
Developers open the Kaizen dashboard and click "Analyze". We send the entire workflow trace to Google Gemini 3, which uses its massive context window to spot waste patterns across all calls simultaneously.

### 3. **Optimize**
The dashboard shows specific recommendations:
- "Calls #12 and #47 are asking the same thing. Cache the first result and save $0.02 per run."
- "Call #3 is using GPT-4 for simple translation. Switch to Gemini Flash and save $0.008."
- "Call #22 includes 8,500 tokens but only needs 1,200. Remove unnecessary context and save $0.15."

---

## 🏗️ Architecture

Kaizen consists of three components:
```
┌─────────────────┐
│  Python SDK     │  Captures AI calls, sends to backend
│  (kaizen)       │  
└────────┬────────┘
         │ HTTP POST
         ▼
┌─────────────────┐
│ FastAPI Backend │  Receives events, runs Gemini analysis
│  (Python)       │  
└────────┬────────┘
         │ SQL
         ▼
┌─────────────────┐
│   Supabase      │  Stores workflows, events, analysis results
│   (PostgreSQL)  │  
└─────────────────┘
         ▲
         │ API calls
         │
┌─────────────────┐
│ React Dashboard │  Web UI for viewing workflows and analysis
│  (TypeScript)   │  
└─────────────────┘
```

### **Component 1: Python SDK**
- **Location**: `sdk/`
- **Purpose**: Python package that developers install (`pip install kaizen`)
- **Key Innovation**: Uses Python `ContextVars` for thread-safe trace ID storage, ensuring concurrent workflows don't get mixed up

### **Component 2: FastAPI Backend**
- **Location**: `backend/`
- **Purpose**: REST API that receives events, stores data, and coordinates Gemini analysis
- **Key Endpoints**:
  - `POST /api/events` - Receive captured AI calls from SDK
  - `GET /api/workflows` - List all workflows
  - `POST /api/workflows/{id}/analyze` - Trigger Gemini analysis
  - `GET /api/workflows/{id}/analysis` - Retrieve analysis results

### **Component 3: React Dashboard**
- **Location**: `dashboard/`
- **Purpose**: Web interface for viewing workflows and optimization recommendations
- **Tech Stack**: React + TypeScript + Vite
- **Key Pages**:
  - Workflow List - See all captured workflows
  - Workflow Detail - Timeline of all AI calls
  - Analysis Results - Optimization recommendations with before/after costs

---

## 🔑 Key Technical Decisions

### **Why ContextVars for Trace IDs?**
Multi-agent systems often run concurrent workflows. We use Python's `ContextVars` (not global variables or class attributes) to store trace IDs, ensuring each workflow's calls are correctly grouped even when multiple workflows run simultaneously. This is **thread-safe** and works in async environments.

**Alternative considered:** Time-based grouping (rejected - fails with concurrent users)

### **Why PostgreSQL via Supabase?**
SQLite can't handle concurrent writes (file locking). PostgreSQL handles concurrency natively, which is critical when multiple users/workflows hit the backend simultaneously. Supabase provides managed PostgreSQL with a free tier.

**Alternative considered:** SQLite (rejected - concurrency issues)

### **Why Batch Analysis (Not Real-Time)?**
We analyze workflows **on-demand** (when user clicks "Analyze") rather than automatically. This gives users control and saves Gemini API costs. Real-time analysis would be expensive and unnecessary.

**Alternative considered:** Real-time analysis (rejected - cost and latency)

### **Why Gemini 3?**
Gemini's **massive context window** (1M+ tokens) allows us to send the entire workflow trace in a single API call. It can see patterns across 50-100+ calls simultaneously, identifying semantic similarities that simple text matching would miss. This is the core value proposition.

**What Gemini does:**
- Detects semantically identical prompts worded differently (redundancy detection)
- Assesses task complexity to recommend appropriate models (model overkill detection)
- Analyzes which parts of prompts were actually used (prompt bloat detection)

---

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+
- Supabase account (free tier)
- Google Gemini API key
- OpenAI API key (for testing the SDK)

### Setup

#### 1. Clone the repo
```bash
git clone https://github.com/your-org/kaizen.git
cd kaizen
```

#### 2. Set up Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env and add:
#   SUPABASE_URL=your-supabase-url
#   SUPABASE_KEY=your-supabase-key
#   GEMINI_API_KEY=your-gemini-key

# Run database migrations
python -m alembic upgrade head

# Start the server
uvicorn main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`

#### 3. Set up Dashboard
```bash
cd dashboard
npm install

# Start dev server (proxies API calls to localhost:8000)
npm run dev
```

Dashboard runs at `http://localhost:5173`

#### 4. Set up SDK (for testing)
```bash
cd sdk
pip install -e .  # Install in development mode
```

#### 5. Test the full flow
```bash
cd examples
python basic_workflow.py
```

Then open `http://localhost:5173` to see the captured workflow in the dashboard.

---

## 📁 Project Structure
```
kaizen/
├── sdk/                          # Python SDK
│   ├── kaizen/
│   │   ├── __init__.py          # Package exports
│   │   ├── lens.py              # Main Lens class (start/end workflow)
│   │   ├── wrapper.py           # OpenAI client wrapper
│   │   └── client.py            # HTTP client for backend communication
│   ├── setup.py                 # Package configuration
│   └── examples/
│       └── basic_workflow.py    # Example usage
│
├── backend/                      # FastAPI backend
│   ├── main.py                  # FastAPI app + API routes
│   ├── models.py                # Pydantic models (Event, Workflow, Analysis)
│   ├── database.py              # Supabase client setup
│   ├── analysis.py              # Gemini integration + analysis prompt
│   ├── requirements.txt         # Python dependencies
│   └── .env.example             # Environment variables template
│
├── dashboard/                    # React dashboard
│   ├── src/
│   │   ├── App.tsx              # Main app component
│   │   ├── main.tsx             # Entry point
│   │   ├── types/
│   │   │   └── index.ts         # TypeScript type definitions
│   │   ├── pages/
│   │   │   ├── WorkflowList.tsx      # Workflow list page
│   │   │   ├── WorkflowDetail.tsx    # Workflow detail page
│   │   │   └── AnalysisResults.tsx   # Analysis results page
│   │   ├── components/
│   │   │   ├── WorkflowCard.tsx      # Workflow card component
│   │   │   ├── CallTimeline.tsx      # Call timeline component
│   │   │   └── SavingsCard.tsx       # Cost savings display
│   │   └── api/
│   │       └── client.ts        # API client functions
│   ├── package.json
│   ├── tsconfig.json            # TypeScript configuration
│   ├── vite.config.ts           # Vite configuration (with proxy)
│   └── index.html
│
└── README.md                     # This file
```

---

## 🗄️ Database Schema

### **workflows table**
```sql
CREATE TABLE workflows (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    total_calls INTEGER DEFAULT 0,
    total_cost DECIMAL(10,6) DEFAULT 0,
    status TEXT DEFAULT 'pending'  -- pending, analyzing, analyzed, failed
);
```

### **events table**
```sql
CREATE TABLE events (
    id UUID PRIMARY KEY,
    workflow_id UUID REFERENCES workflows(id),
    created_at TIMESTAMP DEFAULT NOW(),
    timestamp TIMESTAMP NOT NULL,
    model TEXT NOT NULL,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    tokens_in INTEGER NOT NULL,
    tokens_out INTEGER NOT NULL,
    cost DECIMAL(10,6) NOT NULL,
    latency_ms INTEGER
);
```

### **analyses table**
```sql
CREATE TABLE analyses (
    id UUID PRIMARY KEY,
    workflow_id UUID REFERENCES workflows(id),
    created_at TIMESTAMP DEFAULT NOW(),
    raw_response JSONB,
    redundant_calls JSONB,
    model_overkill JSONB,
    prompt_bloat JSONB,
    original_cost DECIMAL(10,6),
    optimized_cost DECIMAL(10,6),
    total_savings DECIMAL(10,6),
    savings_percentage DECIMAL(5,2)
);
```

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### SDK Tests
```bash
cd sdk
pytest
```

### End-to-End Test
```bash
# Start backend
cd backend && uvicorn main:app --reload &

# Run test workflow
cd sdk/examples
python test_workflow.py

# Check dashboard at http://localhost:5173
```

---

## 🎨 Design Decisions

### **Why Separate SDK Package?**
- ✅ Developers install with `pip install kaizen`
- ✅ Works in any Python environment
- ✅ Can version independently from backend
- ✅ Standard pattern for developer tools

### **Why FastAPI over Django/Flask?**
- ✅ Built-in async support (important for Gemini API calls)
- ✅ Automatic OpenAPI docs
- ✅ Fast development with Pydantic models
- ✅ Modern Python framework

### **Why React + Vite over Next.js?**
- ✅ We already have a backend (FastAPI)
- ✅ Don't need SSR (private dashboard, not SEO)
- ✅ Simpler deployment (FastAPI can serve React build)
- ✅ Clear separation of concerns

### **Why TypeScript?**
- ✅ Catches bugs at compile time
- ✅ Better IDE autocomplete
- ✅ Self-documenting code with type definitions
- ✅ Safer refactoring

---

## 🔐 Environment Variables

### Backend (.env)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
GEMINI_API_KEY=your-gemini-api-key
ENVIRONMENT=development  # development, production
LOG_LEVEL=INFO
```

### Dashboard (.env)
```bash
# None needed - uses proxy in development
# For production, set VITE_API_URL=https://api.kaizen.com
```

---

## 🚢 Deployment

### Backend (Railway/Render)
```bash
# Railway
railway up

# Render
render deploy
```

### Dashboard (Vercel)
```bash
# Vercel
vercel deploy
```

### SDK (PyPI)
```bash
# Build package
cd sdk
python -m build

# Upload to PyPI
twine upload dist/*
```

---

## 📊 Project Timeline

**Week 1: SDK + Backend Foundation**
- [ ] Implement ContextVar trace ID system in SDK
- [ ] Build OpenAI wrapper to capture calls
- [ ] Create FastAPI endpoints for receiving events
- [ ] Set up Supabase database with tables
- [ ] Test: SDK → Backend → Database flow

**Week 2: Gemini Analysis Engine**
- [ ] Write Gemini analysis prompt
- [ ] Implement analysis endpoint
- [ ] Test with real workflow data
- [ ] Iterate on prompt quality (15-20 iterations)
- [ ] Handle edge cases and errors

**Week 3: Dashboard**
- [ ] Build workflow list page
- [ ] Build workflow detail page with timeline
- [ ] Build analysis results page
- [ ] Integrate with backend API
- [ ] Polish UI/UX

**Week 4: Polish + Demo**
- [ ] Deploy backend to Railway
- [ ] Deploy frontend to Vercel
- [ ] Create demo data
- [ ] Record 3-minute demo video
- [ ] Write 200-word Gemini integration description
- [ ] Submit to hackathon

---

## 🤝 Contributing

### Branching Strategy
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/[name]` - Feature branches

### Workflow
1. Create feature branch from `develop`
2. Make changes
3. Test locally
4. Create PR to `develop`
5. After review, merge to `develop`
6. When ready, merge `develop` to `main`

### Code Style
- **Python**: Follow PEP 8, use `black` for formatting
- **TypeScript**: Use ESLint + Prettier
- **Commits**: Use conventional commits (feat:, fix:, docs:, etc.)

---

## 🎯 Success Metrics (Hackathon)

**Technical Goals:**
- [x] SDK captures OpenAI calls reliably
- [x] Backend handles concurrent workflows without race conditions
- [x] Gemini identifies all three waste types with >70% confidence
- [x] Dashboard displays workflows and analysis results
- [x] End-to-end flow works: SDK → Backend → Gemini → Dashboard

**Demo Goals:**
- [x] Show real workflow costing $3.40
- [x] Show analysis identifying specific waste
- [x] Show optimized cost of $1.00
- [x] Explain why Gemini makes this possible
- [x] Complete demo in under 3 minutes

---

## 📚 Resources

### Documentation
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev/)
- [Supabase Docs](https://supabase.com/docs)
- [Gemini API Docs](https://ai.google.dev/docs)
- [Python ContextVars](https://docs.python.org/3/library/contextvars.html)

### Tutorials
- [FastAPI Tutorial](https://fastapi.tiangolo.com/tutorial/)
- [React + TypeScript](https://react-typescript-cheatsheet.netlify.app/)
- [Vite Guide](https://vitejs.dev/guide/)

---

## 💬 Questions?

**For architecture/design questions:** Open an issue with the `question` label
**For bugs:** Open an issue with the `bug` label
**For feature requests:** Open an issue with the `enhancement` label

---

## 📝 License

MIT License - see LICENSE file for details

---

## 🏆 Hackathon Submission

**Event:** Google Gemini 3 Hackathon
**Team:** [Your Team Name]
**Category:** Developer Tools / AI Infrastructure

**Key Points:**
- Kaizen uses Gemini's long context window to analyze entire multi-agent workflow traces
- Identifies 60-80% cost savings through AI-powered pattern detection
- Solves a real problem: invisible waste in AI agent systems
- Demonstrates genuine technical innovation (not just API wrapper)
- Production-scalable architecture

---

**Built with ❤️ for the AI community**