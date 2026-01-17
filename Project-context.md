# Kaizen (AgentLens)

## Multi-Agent AI Cost Optimization Platform

> **"Your AI agents work... but at what cost? Kaizen finds where you're wasting money and shows you exactly how to fix it."**

A performance profiler for multi-agent AI systems built for the **Google Gemini 3 Hackathon** ($100k prize pool).

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [The Problem We're Solving](#the-problem-were-solving)
3. [The Three Types of Waste](#the-three-types-of-waste)
4. [How It Works](#how-it-works)
5. [System Architecture](#system-architecture)
6. [Tech Stack](#tech-stack)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)
9. [SDK Usage](#sdk-usage)
10. [Gemini Integration](#gemini-integration)
11. [Pricing Reference](#pricing-reference)
12. [Project Structure](#project-structure)
13. [Development Setup](#development-setup)
14. [Demo: Vulnerable Agent](#demo-vulnerable-agent)
15. [Hackathon Deliverables](#hackathon-deliverables)
16. [Key Design Decisions](#key-design-decisions)
17. [What's In Scope vs Out of Scope](#whats-in-scope-vs-out-of-scope)

---

## Recent Session Log

### Session Summary - January 15, 2026 (Evening)

**Focus:** Fixed critical bug where workflow statistics (total_calls, total_cost) were not being calculated or displayed in the dashboard.

#### Problem Discovered

The dashboard was showing **$0.00 cost and 0 calls** for all workflows, making the product appear broken. This was a critical issue for the hackathon demo.

**Root Cause:**
1. Database schema was incomplete - missing `total_calls`, `start_time`, and `end_time` columns from the original specification
2. Workflow records were created with default values (0 cost, 0 calls) when events were uploaded
3. After events were stored, workflow statistics were never recalculated or updated
4. The GET /workflows endpoint simply returned raw workflow data without any aggregation

#### Changes Implemented

**1. Fixed Database Schema ([schema.sql](file:///Users/takaratruong/code/Kaizen/backend/schema.sql))**
```sql
-- Added missing columns to workflows table:
start_time timestamp with time zone,
end_time timestamp with time zone,
total_calls integer default 0,
total_cost decimal(10, 6) default 0,  -- Changed from float for accuracy
status text default 'pending'
```

**2. Updated Backend Models ([schemas.py](file:///Users/takaratruong/code/Kaizen/backend/schemas.py))**
```python
class Workflow(BaseModel):
    # ... existing fields ...
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    total_calls: int = 0
    total_cost: float = 0.0
```

**3. Enhanced Events Endpoint ([main.py](file:///Users/takaratruong/code/Kaizen/backend/main.py))**

After each event is inserted, the endpoint now:
- Queries all events for that workflow
- Calculates `total_calls` (count of events)
- Calculates `total_cost` (sum of all event costs)
- Determines `start_time` (earliest event timestamp)
- Determines `end_time` (latest event timestamp)
- Updates the workflow record with these calculated values

**Implementation approach:**
```python
# After inserting event, aggregate statistics
events_response = supabase.table("events")\
    .select("cost, created_at")\
    .eq("workflow_id", workflow_id)\
    .execute()

supabase.table("workflows").update({
    "total_calls": total_calls,
    "total_cost": total_cost,
    "start_time": start_time,
    "end_time": end_time,
    "status": "active"
}).eq("id", workflow_id).execute()
```

#### Why This Approach (Update on Write)

**Rejected approach:** PostgreSQL RPC function to calculate on read
- More complex setup
- Requires creating database functions
- User didn't see the need for RPC functions

**Chosen approach:** Calculate and update after each event insert
- Simpler implementation
- No RPC functions needed
- Statistics always accurate immediately after event upload
- Frontend gets correct data without any changes
- Works perfectly for hackathon demo scale

#### Testing Results

✅ Ran `vulnerable_agent.py` demo successfully
- Created workflow with Trace ID: `204f66cb-dabf-4f36-8fff-ff2d213df0b3`
- 5 events logged demonstrating all 3 waste types
- Workflow statistics now correctly calculated and displayed

#### Files Modified

| File | Changes |
|------|---------|
| `backend/schema.sql` | Added `total_calls`, `start_time`, `end_time` columns; changed `total_cost` to decimal |
| `backend/schemas.py` | Updated `Workflow` model to include new fields |
| `backend/main.py` | Added statistics aggregation after event insertion |

#### Impact on Demo

**Before this fix:**
- Dashboard showed $0.00 for all workflows → Looked completely broken
- Couldn't demonstrate cost savings → No proof of value
- Missing call counts → Incomplete workflow visibility

**After this fix:**
- ✅ Dashboard shows actual costs (e.g., "$0.0023" for 5 calls)
- ✅ Call counts display correctly
- ✅ Start and end times tracked for workflow duration
- ✅ Ready for hackathon demo

#### Database Migration Required

Users need to apply schema changes to Supabase:

**Option 1: Recreate tables (deletes data)**
```sql
-- Run entire schema.sql file in Supabase SQL Editor
```

**Option 2: Add columns only (preserves data)**
```sql
ALTER TABLE workflows 
  ADD COLUMN IF NOT EXISTS start_time timestamp with time zone,
  ADD COLUMN IF NOT EXISTS end_time timestamp with time zone,
  ADD COLUMN IF NOT EXISTS total_calls integer DEFAULT 0,
  ALTER COLUMN total_cost TYPE decimal(10, 6);

-- Backfill existing workflows
UPDATE workflows w SET 
  total_calls = (SELECT COUNT(*) FROM events e WHERE e.workflow_id = w.id),
  total_cost = (SELECT COALESCE(SUM(cost), 0) FROM events e WHERE e.workflow_id = w.id),
  start_time = (SELECT MIN(created_at) FROM events e WHERE e.workflow_id = w.id),
  end_time = (SELECT MAX(created_at) FROM events e WHERE e.workflow_id = w.id);
```

---

### Session Summary - January 15, 2026 (Morning)

**Project Status:** Multi-agent AI cost optimization platform for Google Gemini 3 Hackathon ($100k prize pool). Core functionality complete, moving to final polish and demo preparation.

#### What We Accomplished Today

**1. Created Comprehensive README**
- Built detailed README (`KAIZEN_README.md`) documenting entire project
- Covers architecture, tech stack, database schema, API endpoints, SDK usage, Gemini integration, and the three waste types

**2. Resolved Model Availability Issues**
- Discovered that `gemini-3-flash` is not available via LangChain API (only in AI Studio quota panel)
- Available models: `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.5-pro`
- Updated vulnerable agent to use `gemini-2.5-flash-lite` (cheap) and `gemini-2.5-flash` (expensive for overkill demo)

**3. Fixed Pricing Calculation Bug**
- **Problem:** Costs showing as $0.00
- **Cause:** Model names from API include `models/` prefix (e.g., `models/gemini-2.5-flash`) but pricing table keys don't
- **Fix:** Added `normalize_model_name()` function in `pricing.py` to strip the `models/` prefix

**4. Fixed Missing Events Bug**
- **Problem:** Only 4 of 5 events were reaching the database (prompt bloat call missing)
- **Cause:** Callback handler used `daemon=True` threads that didn't wait for completion
- **Fix:** Updated `KaizenCallbackHandler` to use `thread.join(timeout=self.timeout)` to wait for each event to send

**5. Updated Analysis Prompt**
- Removed hardcoded `recommended_model` list - Gemini now intelligently picks the best model
- Added model tier guidance (expensive vs cheap models)
- Improved prompt bloat detection instructions

**6. Finalized Vulnerable Agent Demo**
- File: `vulnerable_agent.py`
- Uses two models to demonstrate waste:
  - `gemini-2.5-flash-lite` - Standard/cheap calls
  - `gemini-2.5-flash` - Expensive call (for overkill demo)
- 5 LLM calls demonstrating 3 waste types:
  1. MI definition (flash-lite) - Redundant #1
  2. MI explanation (flash-lite) - Redundant #2
  3. Heart attack definition (flash-lite) - Redundant #3
  4. Spanish translation (flash) - Model Overkill
  5. Bloated medical question (flash-lite, ~32K chars) - Prompt Bloat

**7. Successful Analysis Result**
Final test showed all three waste types detected:
```json
{
  "efficiency_score": 47,
  "efficiency_grade": "F",
  "redundancies": { "items": [1 finding - calls 0 & 2] },
  "model_overkill": { "items": [1 finding - call 3, flash → flash-lite] },
  "prompt_bloat": { "items": [1 finding - call 4, 5782 tokens → 50 needed] }
}
```

#### Key Files Modified Today

| File | Changes |
|------|---------|
| `sdk/kaizen/callback.py` | Added `thread.join()` to wait for event sends |
| `backend/pricing.py` | Added `normalize_model_name()` to handle `models/` prefix |
| `backend/prompt.py` | Removed hardcoded model list, improved detection instructions |
| `agentDemos/vulnerable_agent.py` | Updated to use flash-lite + flash models, added debug output |

#### Current Working Architecture

```
Vulnerable Agent (flash-lite + flash)
    ↓
KaizenCallbackHandler (captures 5 events)
    ↓
FastAPI Backend (/events endpoint)
    ↓
Supabase PostgreSQL (stores events)
    ↓
Gemini Analysis (detects 3 waste types)
    ↓
Dashboard (shows efficiency score + recommendations)
```

#### How to Reproduce These Results

Follow these steps to run the vulnerable agent demo and generate the same events:

**Step 1: Start the Backend**
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```
The backend should start at `http://localhost:8000`

**Step 2: Verify Environment Variables**

Make sure `sdk/kaizen/.env` contains:
```bash
GEMINI_API_KEY=your_api_key_here
KAIZEN_BACKEND_URL=http://localhost:8000
```

**Step 3: Run the Vulnerable Agent**
```bash
cd agentDemos
python vulnerable_agent.py
```

**Expected Output:**
```
🔄 Starting Medical Agent Workflow
📋 Trace ID: <uuid-here>

Making 5 LLM calls (demonstrating all 3 waste types)...

Call #1 (Redundant): Asking about MI definition...
Response: <definition response>

Call #2 (Redundant): Asking about MI explanation...
Response: <explanation response>

Call #3 (Redundant): Asking about heart attack...
Response: <definition response>

Call #4 (Model Overkill): Translating with expensive model...
Response: Hola, ¿cómo estás?

Call #5 (Prompt Bloat): Sending 32K character prompt...
Response: <answer about heart rate>

✅ All calls complete!
📊 Check dashboard for Trace ID: <uuid-here>
```

**Step 4: View Results in Dashboard**

1. Start the frontend (in a new terminal):
   ```bash
   cd frontend
   npm run dev
   ```
   Dashboard opens at `http://localhost:5173`

2. Click on the workflow with your Trace ID

3. Click "Analyze Workflow" button

4. View the analysis results showing:
   - Efficiency Score: ~47 (Grade F)
   - 1 Redundancy finding (calls 0 & 2)
   - 1 Model Overkill finding (call 3)
   - 1 Prompt Bloat finding (call 4)

**Troubleshooting:**
- If backend shows "command not found: uvicorn", make sure you activated the virtual environment
- If costs show $0.00, check that model names are being normalized correctly in `backend/pricing.py`
- If only 4 events appear, ensure `callback.py` is using `thread.join()` instead of daemon threads

#### Next Steps

- [ ] Test full flow in dashboard UI
- [ ] Polish UI for hackathon demo
- [ ] Record 3-minute demo video
- [ ] Write 200-word Gemini integration description
- [ ] Final testing and submission

---

## Project Overview

### What is Kaizen?

Kaizen is a **performance profiler for multi-agent AI systems**. Think of it like a fitness tracker for your AI workflows—it monitors what your AI agents are doing, identifies where they're wasting money, and tells you exactly how to fix it.

### Key Metrics

| Metric | Value |
|--------|-------|
| Typical cost savings identified | 60-80% |
| Integration complexity | ~5 lines of code |
| Time to first insights | Minutes after running agents |
| Gemini API calls per analysis | 1 call per workflow |

### Team & Timeline

- **Team Size:** 3 developers
- **Timeline:** 4-week sprint
- **Target:** Google Gemini 3 Hackathon

---

## The Problem We're Solving

### What Are Multi-Agent AI Systems?

Modern AI applications often split work across multiple specialized AI "agents":

```
Agent 1 (Researcher)  → Searches for information
Agent 2 (Summarizer)  → Condenses findings
Agent 3 (Writer)      → Writes the report
Agent 4 (Editor)      → Reviews and improves
```

Each agent makes calls to AI services (GPT-4, Gemini, Claude). A single task might involve **20-100+ AI calls**.

### The Core Problem: Invisible Waste

Developers see the final result and total cost, but they **can't see**:
- Which calls were actually necessary
- Which calls were duplicates
- Which calls used expensive models when cheaper ones would work
- Which calls sent way more information than needed

### Real Example

| What Actually Happened | What Should Have Happened |
|------------------------|---------------------------|
| Cost: $3.40 | Cost: $1.00 |
| 87 AI calls made | 25 AI calls needed |
| 45 seconds to complete | 12 seconds possible |
| Used GPT-4 for everything | GPT-4 only for complex tasks |

If this runs 1,000 times/day → **$72,000/month wasted**

### Why Current Solutions Don't Work

| Tool | What It Does | What's Missing |
|------|--------------|----------------|
| LangSmith | Logs AI calls, basic debugging | No intelligent optimization |
| Helicone | Cost tracking, usage metrics | Just reports costs, doesn't find savings |
| PromptLayer | Prompt versioning, A/B testing | Not multi-agent aware |

**Key difference:** These tools tell you *how much you spent*. Kaizen tells you *how much you should have spent* and exactly how to get there.

---

## The Three Types of Waste

### Type 1: Redundant Calls

**What it is:** The same question asked multiple times in different words.

**Example:**
```
Call 1: "What is the medical definition of Myocardial Infarction?"
Call 2: "Can you explain what MI stands for and what it is?"
Call 3: "Define heart attack - also known as myocardial infarction."
```

These are semantically identical—AI is needed to detect this.

### Type 2: Model Overkill

**What it is:** Using expensive AI models for simple tasks.

**Example:**
```
Task: "Translate 'Hello, how are you?' to Spanish."
Used: gemini-1.5-pro ($3.50/1M tokens)
Should use: gemini-1.5-flash ($0.075/1M tokens)
Difference: 47x more expensive!
```

### Type 3: Prompt Bloat

**What it is:** Sending way more text than necessary.

**Example:**
```
Sent: 5,000 tokens of conversation history
Needed: Last 200 tokens
Task: "What is the normal resting heart rate?"
```

---

## How It Works

### Three Simple Steps

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  1. CAPTURE          2. ANALYZE           3. OPTIMIZE          │
│                                                                 │
│  ┌─────────┐        ┌─────────┐         ┌─────────┐           │
│  │   SDK   │   →    │ Gemini  │    →    │Dashboard│           │
│  │captures │        │analyzes │         │  shows  │           │
│  │all calls│        │patterns │         │ savings │           │
│  └─────────┘        └─────────┘         └─────────┘           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Step 1: Capture**
- Developer adds Kaizen SDK to their application
- SDK automatically records every AI call (prompt, response, cost, latency)
- Data sent to backend asynchronously (doesn't slow down the app)

**Step 2: Analyze**
- Developer clicks "Analyze" in dashboard
- Backend sends complete workflow trace to Gemini 3
- Gemini's long context window sees patterns across 50-100+ calls
- Returns structured analysis with specific findings

**Step 3: Optimize**
- Dashboard shows before/after cost comparison
- Three sections for each waste type
- Specific recommendations with confidence scores
- Developer implements changes

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         DEVELOPER'S APPLICATION                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    Multi-Agent AI System                        │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │  │
│  │  │ Agent 1  │  │ Agent 2  │  │ Agent 3  │  │ Agent N  │       │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │  │
│  │       │             │             │             │              │  │
│  │       └─────────────┴──────┬──────┴─────────────┘              │  │
│  │                            │                                   │  │
│  │                    ┌───────▼───────┐                          │  │
│  │                    │  Kaizen SDK   │ (LangChain Callback)     │  │
│  │                    │  - Captures   │                          │  │
│  │                    │  - Trace IDs  │                          │  │
│  │                    │  - Costs      │                          │  │
│  │                    └───────┬───────┘                          │  │
│  └────────────────────────────┼───────────────────────────────────┘  │
└───────────────────────────────┼───────────────────────────────────────┘
                                │
                                │ HTTP POST /events
                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│                          KAIZEN BACKEND                                │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                      FastAPI Server                              │  │
│  │                                                                  │  │
│  │  POST /events ──────► Store events in DB                        │  │
│  │  GET /workflows ────► List all workflows                        │  │
│  │  GET /workflows/{id} ► Get workflow details                     │  │
│  │  POST /workflows/{id}/analyze ──┐                               │  │
│  │  GET /workflows/{id}/analysis   │                               │  │
│  │                                 │                               │  │
│  └─────────────────────────────────┼───────────────────────────────┘  │
│                                    │                                   │
│                                    ▼                                   │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    Gemini Analysis Engine                        │  │
│  │                                                                  │  │
│  │  • Sends full workflow trace (all prompts + truncated responses)│  │
│  │  • Single API call leveraging 1M+ token context window          │  │
│  │  • Returns structured JSON with findings                        │  │
│  │  • Confidence scores filter weak suggestions (≥0.7 threshold)   │  │
│  │                                                                  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                   Supabase (PostgreSQL)                          │  │
│  │                                                                  │  │
│  │  Tables: events | workflows | analyses                          │  │
│  │  • Handles concurrent writes natively                           │  │
│  │  • UUID primary keys for distributed uniqueness                 │  │
│  │                                                                  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
                                │
                                │ REST API
                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│                        KAIZEN DASHBOARD                                │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    React Frontend                                │  │
│  │                                                                  │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │  │
│  │  │  Workflow   │  │  Workflow   │  │   Analysis Results      │ │  │
│  │  │    List     │→ │   Detail    │→ │                         │ │  │
│  │  │             │  │  + Timeline │  │  Before: $3.40          │ │  │
│  │  │ • Name      │  │  + Analyze  │  │  After:  $1.00          │ │  │
│  │  │ • Cost      │  │    Button   │  │  Savings: 70%           │ │  │
│  │  │ • Calls     │  │             │  │                         │ │  │
│  │  │ • Status    │  │             │  │  • Redundant Calls      │ │  │
│  │  │             │  │             │  │  • Model Overkill       │ │  │
│  │  │             │  │             │  │  • Prompt Bloat         │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘ │  │
│  │                                                                  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **SDK** | Python + LangChain Callbacks | Industry standard for AI apps |
| **Backend** | FastAPI | Fast development, async support, Python ecosystem |
| **Database** | Supabase (PostgreSQL) | Handles concurrent writes, managed service, free tier |
| **Frontend** | React + TypeScript + Tailwind + Shadcn/ui | Industry standard, fast development |
| **Analysis** | Google Gemini 3 | Long context window (1M+ tokens), cost-effective |
| **State Management** | Python ContextVars | Thread-safe isolation for async environments |

---

## Database Schema

### Events Table

Stores every individual AI call.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Unique identifier for this event |
| `workflow_id` | uuid | Foreign key to workflows table (the Trace ID) |
| `created_at` | timestamp | When this record was created |
| `call_id` | text | Identifier for the specific AI call |
| `timestamp` | timestamp | When the AI call actually happened |
| `model` | text | Which AI model was used |
| `prompt` | text | The full prompt sent to the AI |
| `response` | text | The response received |
| `tokens_in` | integer | Number of input tokens |
| `tokens_out` | integer | Number of output tokens |
| `cost` | decimal | Cost in USD |
| `latency_ms` | integer | How long the call took |

### Workflows Table

Stores summary information about each workflow.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Unique identifier (the Trace ID) |
| `name` | text | Human-readable name |
| `created_at` | timestamp | When this record was created |
| `start_time` | timestamp | When the first call happened |
| `end_time` | timestamp | When the last call happened |
| `total_calls` | integer | Number of AI calls |
| `total_cost` | decimal | Sum of all call costs |
| `status` | text | `pending`, `analyzing`, `analyzed`, or `failed` |

### Analyses Table

Stores the analysis results from Gemini.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Unique identifier |
| `workflow_id` | uuid | Reference to workflows table |
| `created_at` | timestamp | When analysis was performed |
| `raw_response` | jsonb | Full response from Gemini |
| `redundancies` | jsonb | List of redundant call findings |
| `model_overkill` | jsonb | List of model overkill findings |
| `prompt_bloat` | jsonb | List of prompt bloat findings |
| `original_cost` | decimal | What the workflow actually cost |
| `optimized_cost` | decimal | What it could cost after fixes |
| `total_savings` | decimal | Difference |
| `savings_percentage` | decimal | Percentage reduction possible |

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/events` | POST | Receives batches of AI call events from SDKs |
| `/workflows` | GET | Returns list of workflows with basic stats |
| `/workflows/{id}` | GET | Returns full details of a specific workflow |
| `/workflows/{id}/analyze` | POST | Triggers Gemini analysis on a workflow |
| `/workflows/{id}/analysis` | GET | Returns analysis results for a workflow |

---

## SDK Usage

### Installation

```python
from kaizen import KaizenCallbackHandler, reset_trace_id, get_trace_id
```

### Basic Usage with LangChain

```python
import os
from langchain_google_genai import ChatGoogleGenerativeAI
from kaizen import KaizenCallbackHandler, reset_trace_id, get_trace_id

# Initialize
reset_trace_id()  # Generates new UUID for this workflow
handler = KaizenCallbackHandler()

print(f"Trace ID: {get_trace_id()}")

# Create LLM with callback
llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash",
    callbacks=[handler],
    google_api_key=os.getenv("GEMINI_API_KEY")
)

# Make calls - automatically captured!
response = await llm.ainvoke([HumanMessage(content="Hello!")])

# All calls are now in the backend, ready for analysis
```

### What Gets Captured

For every AI call, the SDK records:

| Data Point | Description |
|------------|-------------|
| Trace ID | The workflow this call belongs to |
| Timestamp | Exactly when the call happened |
| Model | Which AI model was used |
| Prompt | The full question/instructions |
| Response | The answer returned |
| Token counts | Input and output tokens |
| Cost | Calculated cost in USD |
| Latency | How long the call took (ms) |

### Why ContextVars for Trace IDs?

```python
# Thread-safe storage via contextvars
# Each async request maintains its own isolated Trace ID

# Example: Two concurrent users
# Time     User A's Calls         User B's Calls
# 10:00:00 Call 1 (Trace: AAA)    Call 1 (Trace: BBB)
# 10:00:02 Call 2 (Trace: AAA)    
# 10:00:03                        Call 2 (Trace: BBB)
# 10:00:05 Call 3 (Trace: AAA)    Call 3 (Trace: BBB)

# Result: Perfect separation despite interleaved timing
# Workflow AAA: User A's Calls 1, 2, 3
# Workflow BBB: User B's Calls 1, 2, 3
```

---

## Gemini Integration

### Why Gemini 3 is Essential

1. **Long Context Window (1M+ tokens)**
   - Can analyze 50-100+ AI calls in a single request
   - Sees patterns across the entire workflow at once
   - Other models would require splitting into multiple requests

2. **Tasks Only AI Can Do**
   - **Redundancy:** "Translate myocardial infarction" vs "What is MI?" look different to computers but mean the same thing
   - **Model Assessment:** A short prompt can be complex; a long prompt can be simple
   - **Bloat Detection:** Need to understand what was actually used, not just count tokens

### What Gets Sent to Gemini

```
┌─────────────────────────────────────────────┐
│ Complete list of AI calls in the workflow   │
│ • Full prompt for each call                 │
│ • Truncated response (first 500 tokens)     │
│ • Model used                                │
│ • Token counts                              │
│ • Cost                                      │
│ • Timing                                    │
├─────────────────────────────────────────────┤
│ Instructions on what to look for            │
│ • Redundancy detection criteria             │
│ • Model appropriateness criteria            │
│ • Bloat identification criteria             │
├─────────────────────────────────────────────┤
│ Expected output format (JSON)               │
└─────────────────────────────────────────────┘
```

### Example Gemini Response

```json
{
  "workflow_summary": {
    "total_calls": 87,
    "total_cost": 3.40,
    "duration_seconds": 45
  },
  "redundant_calls": [
    {
      "call_ids": ["call_12", "call_47"],
      "reason": "Both calls ask for translation of 'myocardial infarction' to plain English",
      "keep_call_id": "call_12",
      "savings_usd": 0.02,
      "confidence": 0.95
    }
  ],
  "model_overkill": [
    {
      "call_id": "call_3",
      "current_model": "gemini-1.5-pro",
      "recommended_model": "gemini-1.5-flash",
      "task_type": "simple_translation",
      "reason": "Straightforward translation requiring no complex reasoning",
      "savings_usd": 0.008,
      "confidence": 0.91
    }
  ],
  "prompt_bloat": [
    {
      "call_id": "call_22",
      "current_tokens": 8500,
      "estimated_necessary_tokens": 1200,
      "unnecessary_content": "Full conversation history but only last exchange relevant",
      "savings_usd": 0.15,
      "confidence": 0.82
    }
  ],
  "total_original_cost": 3.40,
  "total_optimized_cost": 1.02,
  "total_savings": 2.38,
  "savings_percentage": 70.0
}
```

### Confidence Threshold

Only suggestions with confidence ≥ 0.7 are shown in the dashboard. This filters out weak or uncertain suggestions.

---

## Pricing Reference

Prices per 1 million tokens:

| Model | Input Price | Output Price | Category |
|-------|-------------|--------------|----------|
| GPT-4 | $30.00 | $60.00 | Expensive |
| GPT-4 Turbo | $10.00 | $30.00 | Expensive |
| GPT-4o | $5.00 | $15.00 | Mid-tier |
| GPT-3.5 Turbo | $0.50 | $1.50 | **Cheap** |
| Claude 3 Opus | $15.00 | $75.00 | Expensive |
| Claude 3 Sonnet | $3.00 | $15.00 | Mid-tier |
| Claude 3 Haiku | $0.25 | $1.25 | **Cheap** |
| Gemini 1.5 Pro | $3.50 | $10.50 | Mid-tier |
| Gemini 1.5 Flash | $0.075 | $0.30 | **Cheap** |

**Key insight:** GPT-4 costs **60x more** than GPT-3.5 Turbo. Gemini Pro costs **47x more** than Gemini Flash.

### Savings Calculations

```
Redundancy savings = Cost of duplicate calls that could be eliminated
Model overkill savings = (Expensive model cost) - (Cheap model cost)
Prompt bloat savings = Cost of unnecessary tokens removed
Total optimized cost = Original cost - All savings
```

---

## Project Structure

```
kaizen/
├── sdk/
│   └── kaizen/
│       ├── __init__.py          # Exports: KaizenCallbackHandler, reset_trace_id, get_trace_id
│       ├── callback.py          # LangChain callback handler
│       ├── pricing.py           # Model pricing calculations
│       └── .env                 # GEMINI_API_KEY, BACKEND_URL
│
├── backend/
│   ├── main.py                  # FastAPI application
│   ├── routes/
│   │   ├── events.py            # POST /events
│   │   ├── workflows.py         # GET/POST /workflows
│   │   └── analysis.py          # Analysis endpoints
│   ├── services/
│   │   ├── gemini_analyzer.py   # Gemini integration
│   │   └── pricing.py           # Cost calculations
│   ├── models/
│   │   └── schemas.py           # Pydantic models
│   └── database/
│       └── supabase.py          # Database client
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── WorkflowList.tsx
│   │   │   ├── WorkflowDetail.tsx
│   │   │   └── AnalysisResults.tsx
│   │   ├── components/
│   │   │   ├── CostComparison.tsx
│   │   │   ├── WasteTypeCard.tsx
│   │   │   └── CallTimeline.tsx
│   │   └── api/
│   │       └── client.ts
│   └── package.json
│
├── demo/
│   └── vulnerable_agent.py      # Demo agent showing all 3 waste types
│
└── README.md
```

---

## Development Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- Supabase account (free tier)
- Google AI Studio API key

### Environment Variables

```bash
# sdk/kaizen/.env
GEMINI_API_KEY=your_gemini_api_key
KAIZEN_BACKEND_URL=http://localhost:8000

# backend/.env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

### Running Locally

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm run dev

# Run demo agent
cd demo
python vulnerable_agent.py
```

---

## Demo: Vulnerable Agent

A demonstration agent that exhibits all three types of waste:

```python
"""
Simulated Agent: Medical Report Summarizer
Demonstrates all three waste types in a realistic workflow.
"""

# Type 1: Redundant Calls (3 semantically identical questions)
"What is the medical definition of Myocardial Infarction?"
"Can you explain what MI stands for and what it is?"
"Define heart attack - also known as myocardial infarction."

# Type 2: Model Overkill (Pro model for simple translation)
Model: gemini-1.5-pro  # $3.50/1M tokens
Task: "Translate 'Hello, how are you?' to Spanish."
Should use: gemini-1.5-flash  # $0.075/1M tokens

# Type 3: Prompt Bloat (~5000 tokens for simple question)
Context: 30x repeated conversation history about weather/restaurants
Question: "What is the normal resting heart rate for an adult?"
```

### Expected Results

```
Before optimization: ~$0.05-0.10
After optimization:  ~$0.01-0.02
Potential savings:   70-80%
```

---

## Hackathon Deliverables

| Requirement | Deliverable | Status |
|-------------|-------------|--------|
| NEW application using Gemini 3 | Kaizen built from scratch | ✅ |
| ~200 word writeup | Gemini integration description | Week 4 |
| Public project link | Deployed dashboard with demo data | Week 4 |
| Public code repository | GitHub repository | Week 1 |
| ~3 minute demo video | Screen recording of full flow | Week 4 |
| No login required | Dashboard accessible without auth | ✅ Planned |

### Demo Strategy

Pre-populate dashboard with 2-3 analyzed workflows so judges can:
1. See the workflow list immediately
2. Click into a workflow and see captured AI calls
3. View completed analysis with real savings
4. Experience the product without running anything

### 200-Word Gemini Integration Summary (Draft)

> Kaizen uses Google Gemini 3 as its core intelligence layer for analyzing multi-agent AI workflow traces. When a developer triggers analysis, we send the complete workflow trace—including all prompts, responses, costs, and timing data—to Gemini in a single API call.
>
> Gemini's massive context window is essential to our approach: it allows the model to see patterns across 50-100+ AI calls simultaneously, identifying redundancies that span different agents and detecting semantic similarities that simple text matching would miss.
>
> We rely on Gemini for three types of analysis that require genuine language understanding: detecting semantically identical calls worded differently, assessing whether a task's complexity requires an expensive model or if a cheaper one would suffice, and identifying which portions of prompts contained unnecessary context. These tasks cannot be accomplished with rules or traditional code—they require an AI that understands meaning, not just text.
>
> The result: developers see exactly where they're wasting money on AI calls, with specific recommendations and confidence scores for each finding.

---

## Key Design Decisions

### Why Supabase (PostgreSQL) instead of SQLite?

SQLite cannot handle concurrent writes. If two users hit the backend simultaneously, one request blocks the other (or causes corruption). PostgreSQL handles concurrency natively.

### Why Trace IDs instead of time-based grouping?

Time-based grouping ("calls within 60 seconds are one workflow") fails with concurrent users. User A and User B's calls would merge incorrectly. Trace IDs provide cryptographic certainty—every call links to exactly one workflow.

### Why Wrapper Pattern instead of Monkey-Patching?

Monkey-patching globally replaces library functions—fragile and breaks on library updates. The wrapper pattern is explicit and safe: only affects the specific client you wrap.

### Why ContextVars instead of instance variables?

Instance variables (`self.workflow_id`) create race conditions in async environments. Python's `contextvars` provides thread-safe, request-isolated storage—essential for FastAPI.

---

## What's In Scope vs Out of Scope

### ✅ In Scope (Building This)

- Python SDK using wrapper pattern and contextvars
- Deterministic workflow identification via Trace IDs
- FastAPI backend server with async support
- Supabase (PostgreSQL) database
- Gemini 3 analysis for three waste types
- React dashboard with workflow list, detail, and analysis views
- Before/after cost comparison display
- Confidence scores for suggestions (0.7 threshold)

### ❌ Out of Scope (Not Building)

- Support for AI providers other than Gemini (via LangChain)
- User authentication and multi-tenancy
- Real-time updates (using simple polling)
- Automatic code generation for fixes
- Streaming response support
- Historical trends and analytics
- Publishing SDK to PyPI
- Custom domain setup

---

## Four-Week Build Plan

### Week 1: Capture Pipeline
- Build SDK that captures LangChain calls
- Build backend server with /events endpoint
- Set up Supabase database
- Test end-to-end: SDK → Backend → Database
- Build demo vulnerable agent

**Deliverable:** Run an AI agent and see calls appear in database.

### Week 2: Analysis Engine
- Finalize and test Gemini analysis prompt
- Build /workflows and /analyze endpoints
- Build JSON parsing for Gemini response
- Store analysis results in database

**Deliverable:** Trigger analysis and get structured optimization suggestions.

### Week 3: Dashboard
- Set up React project
- Build workflow list page
- Build workflow detail page with timeline
- Build analysis results view
- Connect to backend API
- Deploy frontend and backend

**Deliverable:** Working website to view workflows and analysis.

### Week 4: Polish and Submit
- UI polish (loading states, error handling)
- Pre-populate demo data
- Record 3-minute demo video
- Write 200-word Gemini integration description
- Final testing and bug fixes
- Submit!

**Deliverable:** Complete hackathon submission.

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Gemini returns malformed JSON | Medium | Analysis fails | Robust parsing with fallbacks, retry logic |
| Gemini analysis is inaccurate | Medium | False positives | Confidence threshold filters weak suggestions |
| SDK breaks user's application | Low | Critical | Extensive error handling, graceful degradation |
| Large workflows exceed context | Low | Incomplete analysis | Cap at 200 calls, truncate if needed |
| Prompt engineering takes too long | High | Week 2 delays | Start testing immediately |
| Dashboard takes too long | Medium | Week 3/4 delays | Use component libraries, prioritize core views |

---

## Quick Reference

### Core Concept
**AI analyzing AI** - Using Gemini to find inefficiencies in multi-agent workflows that humans and traditional tools can't detect.

### Three Waste Types
1. **Redundant Calls** - Same question, different words
2. **Model Overkill** - Expensive model for simple tasks
3. **Prompt Bloat** - Too much context for the task

### Value Proposition
- **Current tools:** Tell you how much you spent
- **Kaizen:** Tells you how much you *should* have spent and how to get there

### Key Differentiator
Gemini's 1M+ token context window allows holistic analysis of entire workflows in a single API call—seeing patterns that span multiple agents and dozens of calls.

---

*Built for the Google Gemini 3 Hackathon*