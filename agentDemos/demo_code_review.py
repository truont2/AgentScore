import os
import asyncio
import sys
from pathlib import Path
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI

sys.path.append(str(Path(__file__).resolve().parent.parent / "sdk"))
from agentscore import AgentScoreCallbackHandler, reset_trace_id, get_trace_id

env_path = Path(__file__).resolve().parent.parent / "sdk" / "agentscore" / ".env"
load_dotenv(dotenv_path=env_path)

"""
AS-1 Workflow 3: Code Review Assistant
Goal: ~28 calls, ~$4.12 (Highest Cost)
Waste Types: Redundancy, Overkill, Bloat
"""

async def invoke_with_retry(llm, messages, retries=5, delay=65):
    for attempt in range(retries):
        try:
            return await llm.ainvoke(messages)
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                print(f"  Rate limit hit. Retrying in {delay}s... (Attempt {attempt+1}/{retries})")
                if attempt < retries - 1:
                    await asyncio.sleep(delay)
                    continue
            raise e

async def run_code_review_workflow():
    reset_trace_id()
    handler = AgentScoreCallbackHandler()
    trace_id = get_trace_id()
    print(f"\nExample 3: Code Review Assistant (Trace: {trace_id})")
    print("Target: ~28 calls, ~$4.12")

    llm_cheap = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-lite", 
        callbacks=[handler],
        google_api_key=os.getenv("GEMINI_AGENT_KEY")
    )
    
    llm_expensive = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash", # Price multiplier active
        callbacks=[handler],
        google_api_key=os.getenv("GEMINI_AGENT_KEY")
    )

    functions = [
        "def auth_user(token): ...",
        "def query_db(sql): ...",
        "def render_template(ctx): ...",
        "def api_handler(req): ..."
    ]

    # FLIGHT 1: Syntax Check (Redundant) (4 funcs * 2 calls = 8 calls)
    print("  Phase 1: Syntax Checks (Redundant)...")
    for func in functions:
        await invoke_with_retry(llm_cheap, [HumanMessage(content=f"Check syntax: {func}")])
        await invoke_with_retry(llm_cheap, [HumanMessage(content=f"Are there syntax errors in: {func}")])

    # FLIGHT 2: Logic Audit (Overkill) (4 funcs * 2 calls = 8 calls)
    # Using expensive model heavily here to drive up cost to $4.12
    print("  Phase 2: Logic Audit (Overkill)...")
    for func in functions:
        await invoke_with_retry(llm_expensive, [HumanMessage(content=f"Audit this code for logic bugs: {func}")])
        await invoke_with_retry(llm_expensive, [HumanMessage(content=f"Suggest performance improvements: {func}")])

    # FLIGHT 3: Style Check (Bloat) (4 funcs * 1 call = 4 calls)
    print("  Phase 3: Style Check (Bloat)...")
    repo_context = "FULL REPO CONTENT " * 1000
    for func in functions:
        msg = f"Repo Context: {repo_context}\n\nCheck style for: {func}"
        await invoke_with_retry(llm_cheap, [HumanMessage(content=msg)])
        
    # FLIGHT 4: Final Summary (8 calls to reach ~28)
    print("  Phase 4: Summary Generation...")
    for i in range(8):
        await invoke_with_retry(llm_cheap, [HumanMessage(content=f"Summarize review findings for item {i}")])

    print("  ✓ Workflow 3 Complete")

if __name__ == "__main__":
    asyncio.run(run_code_review_workflow())
