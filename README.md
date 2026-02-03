# AgentScore

**Your AI agents work... but at what cost?**

AgentScore is a performance profiler for multi-agent AI systems. Think of it as a fitness tracker for your AI workflows—it monitors what your agents are doing, identifies where they're wasting money, and tells you exactly how to fix it.

Built for the **Google Gemini 3 Hackathon**.

---

## The Problem

Multi-agent AI systems are powerful but wasteful. Developers see the final output and total cost, but have zero visibility into:

- Which calls were actually necessary
- Which calls duplicated work already done
- Which calls used expensive models when cheaper ones would suffice
- Which calls sent way more context than needed

A workflow that costs **$3.40** might only need to cost **$1.00**. At scale, that's $72,000/month wasted.

---

## How It Works

### 1. Capture
Add our lightweight SDK to your application. We use a standard LangChain Callback Handler to silently capture every LLM call in the background.

```python
from langchain_openai import ChatOpenAI
from agentscore import AgentScoreCallbackHandler

# Add the handler to your LLM or Chain
llm = ChatOpenAI(
    callbacks=[AgentScoreCallbackHandler()]
)

# Your multi-agent workflow runs normally
response = llm.invoke("Process customer request")
```

### 2. Analyze
Trigger analysis and AgentScore sends your workflow trace to Gemini 3. The massive context window allows Gemini to see patterns across 50-100+ calls simultaneously—detecting inefficiencies that would take hours to find manually.

### 3. Optimize
View your results in the dashboard:
- **Efficiency Score** (0-100) showing overall workflow health
- **Before/After cost comparison** with concrete savings
- **Specific recommendations** with confidence scores

---

## The Three Agent Sins

AgentScore detects three categories of waste that plague multi-agent systems—derived from inefficiency patterns identified in Anthropic's *Building Effective Agents* and OpenAI's *A Practical Guide to Building Agents*:

### 🔄 Redundant Calls
Semantically identical requests worded differently.

> *"Translate myocardial infarction"* and *"What is MI in plain English?"* are the same question—but simple text matching won't catch it.

Violates the **prompt chaining principle**: each call should process the output of the previous one, not re-request the same information.

### 💸 Model Overkill
Expensive models used for simple tasks.

> Using GPT-4 ($30/1M tokens) for basic classification when Gemini Flash ($0.35/1M tokens) produces identical results.

As OpenAI notes: *"Not every task requires the smartest model—a simple retrieval or intent classification task may be handled by a smaller, faster model."*

### 📜 Context Bloat
Unnecessary tokens stuffed into prompts.

> Sending 10,000 tokens of conversation history when only the last 500 were relevant.

Each call should include only the context needed for that specific action—not the entire conversation history.

---

## Efficiency Score

Every workflow receives an **Efficiency Score from 0-100**:

| Score | Rating | What It Means |
|-------|--------|---------------|
| 90-100 | Excellent | Minimal waste, well-optimized |
| 70-89 | Good | Some room for improvement |
| 50-69 | Fair | Significant optimization opportunities |
| 0-49 | Poor | Major inefficiencies detected |

The score gamifies optimization—watch your number climb as you implement recommendations.

**Score Calculation:**
- Redundancy penalty: Weighted by severity (exact duplicates penalized more than partial overlaps)
- Model overkill penalty: Based on task complexity classification (classification, routing, extraction → use cheap models)
- Context bloat penalty: Proportional to unnecessary token percentage
- All findings filtered by confidence threshold (≥0.7)

---

## Why Gemini 3?

AgentScore isn't just *using* Gemini—it **requires** Gemini's unique capabilities:

**Long Context Window**: Analyze entire workflow traces (50-100+ calls) in a single request. Other models would require chunking, losing cross-workflow pattern detection.

**Semantic Understanding**: Detecting that two differently-worded prompts are asking the same thing requires genuine language comprehension, not regex.

**Task Complexity Assessment**: Determining whether a task needs GPT-4 or Gemini Flash requires reasoning about the actual cognitive demands—something only AI can do reliably. Our analysis uses explicit task classification criteria: classification, routing, translation, and extraction are simple tasks; multi-step reasoning, planning, and synthesis require capable models.

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Your App +    │────▶│  FastAPI        │────▶│   Supabase      │
│   AgentScore    │     │  Backend        │     │   PostgreSQL    │
│   SDK           │     │                 │     │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │   Gemini 3      │
                        │   Analysis      │
                        └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │   React         │
                        │   Dashboard     │
                        └─────────────────┘
```

**Stack:**
- **SDK**: Python, LangChain callback handlers, ContextVars for thread-safe tracing
- **Backend**: FastAPI, async-first design
- **Database**: Supabase PostgreSQL (handles concurrent writes)
- **Frontend**: React, Tailwind CSS, dark mode developer aesthetic
- **Analysis Engine**: Google Gemini 3

---

## Installation & Setup

### 1. Install SDK
Currently, you can install the SDK directly from GitHub:

```bash
pip install git+https://github.com/takaratruong/Kaizen.git#subdirectory=sdk
```

### 2. Development Setup

If you want to run the full stack (Dashboard + Backend) locally:

**Prerequisites:**
- Python 3.11+
- Node.js 18+
- Supabase account

**Backend Setup:**
```bash
# Create venv
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt
pip install -e sdk/

# Configure .env (in backend/)
# SUPABASE_URL=...
# SUPABASE_KEY=...
# GEMINI_API_KEY=...

# Run Server
cd backend
uvicorn main:app --reload
```

**Frontend Setup:**
```bash
cd frontend
npm install
npm run dev
```

### 3. Usage

```python
from langchain_openai import ChatOpenAI
from agentscore import AgentScoreCallbackHandler, set_trace_id
import uuid

# 1. Initialize Callback
handler = AgentScoreCallbackHandler()

# 2. Set a workflow ID (optional, for grouping)
set_trace_id(str(uuid.uuid4()))

# 3. Use in your Chain/LLM
llm = ChatOpenAI(callbacks=[handler])
llm.invoke("Hello world")
```

## Troubleshooting

### "Command not found: uvicorn"
Make sure you've activated the virtual environment: `source venv/bin/activate`

### Backend shows $0.00 for workflows
Apply the database schema changes to Supabase. Run the SQL from `backend/schema.sql` in your Supabase SQL Editor.

---

## Team

Built by a 3-developer team in 4 weeks for the Google Gemini 3 Hackathon.

---

## License

MIT

---

*Stop flying blind. Start optimizing.*