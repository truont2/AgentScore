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
Add our lightweight SDK to your application. Wrap your AI client and mark workflow boundaries—AgentScore silently captures every LLM call in the background.

```python
from agentscore import AgentScore

lens = AgentScore()
client = lens.wrap(OpenAI())

lens.start_workflow("Process customer request")
# Your multi-agent workflow runs normally
lens.end_workflow()
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

AgentScore detects three categories of waste that plague multi-agent systems:

### 🔄 Redundant Calls
Semantically identical requests worded differently.

> *"Translate myocardial infarction"* and *"What is MI in plain English?"* are the same question—but simple text matching won't catch it.

### 💸 Model Overkill
Expensive models used for simple tasks.

> Using GPT-4 ($30/1M tokens) for basic translation when Gemini Flash ($0.35/1M tokens) produces identical results.

### 📜 Context Bloat
Unnecessary tokens stuffed into prompts.

> Sending 10,000 tokens of conversation history when only the last 500 were relevant.

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
- Redundancy penalty: -points per duplicate call cluster
- Model overkill penalty: -points per overspec'd model
- Context bloat penalty: -points based on excess tokens
- Weighted by cost impact and confidence

---

## Why Gemini 3?

AgentScore isn't just *using* Gemini—it **requires** Gemini's unique capabilities:

**Long Context Window**: Analyze entire workflow traces (50-100+ calls) in a single request. Other models would require chunking, losing cross-workflow pattern detection.

**Semantic Understanding**: Detecting that two differently-worded prompts are asking the same thing requires genuine language comprehension, not regex.

**Task Complexity Assessment**: Determining whether a task needs GPT-4 or Gemini Flash requires reasoning about the actual cognitive demands—something only AI can do reliably.

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

## Key Technical Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Workflow ID | Deterministic Trace IDs via ContextVars | 100% accurate grouping even with concurrent users |
| SDK Pattern | Wrapper (`lens.wrap(client)`) | Safer than monkey-patching, won't break on library updates |
| Database | PostgreSQL | Native concurrency handling for multi-user scenarios |
| Analysis | Single Gemini call per workflow | Leverages long context window, simpler architecture |
| Confidence Filter | 0.7 threshold | Shows only high-confidence recommendations |

---

## MVP Features

- ✅ Python SDK with OpenAI wrapper
- ✅ Automatic capture of all LLM calls (prompt, response, cost, latency)
- ✅ Thread-safe workflow tracing
- ✅ FastAPI backend with event ingestion
- ✅ Gemini-powered analysis detecting all three Agent Sins
- ✅ Efficiency Score calculation
- ✅ React dashboard with workflow list and analysis views
- ✅ Before/after cost comparison
- ✅ Actionable recommendations with confidence scores

---

## Post-MVP Roadmap

### Phase 1: Expand Coverage
- [ ] Anthropic (Claude) SDK support
- [ ] Google (Gemini) SDK support
- [ ] Native LangChain integration
- [ ] PyPI package publication

### Phase 2: Production Features
- [ ] User authentication & team workspaces
- [ ] Historical analytics and cost trends
- [ ] Spending alerts and anomaly detection
- [ ] CI/CD integration via API
- [ ] Webhook notifications

### Phase 3: Advanced Intelligence
- [ ] **Auto-fix generation**: Generate code patches for detected issues
- [ ] **A/B testing**: Compare optimization strategies
- [ ] **Custom rules**: Define organization-specific optimization policies
- [ ] **Benchmark comparisons**: See how your efficiency compares to anonymized industry data
- [ ] **Real-time streaming**: Live efficiency monitoring during workflow execution

---

## Differentiation

| Tool | What It Does | What's Missing |
|------|--------------|----------------|
| LangSmith | Logs calls, basic debugging | No intelligent optimization |
| Helicone | Cost tracking, metrics | Reports costs, doesn't find savings |
| PromptLayer | Prompt versioning | Not multi-agent aware |
| **AgentScore** | **AI-powered optimization** | **Tells you what to fix and how** |

The key difference: Other tools tell you *how much you spent*. AgentScore tells you *how much you should have spent* and exactly how to get there.

---

## Quick Start

```bash
# Install SDK
pip install agentscore

# Initialize
from agentscore import AgentScore
from openai import OpenAI

lens = AgentScore(api_key="your-api-key")
client = lens.wrap(OpenAI())

# Track workflow
lens.start_workflow("My Agent Task")

# Your agent code runs normally...
response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello!"}]
)

lens.end_workflow()

# View results at dashboard.agentscore.dev
```

---

## Team

Built by a 3-developer team in 4 weeks for the Google Gemini 3 Hackathon.

---

## License

MIT

---

*Stop flying blind. Start optimizing.*