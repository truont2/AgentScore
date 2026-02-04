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
AS-1 Workflow 2: Customer Support Router
Goal: ~32 calls, ~$2.85
Waste Types: Redundancy, Overkill, Bloat
"""

async def invoke_with_retry(llm, messages, retries=3, delay=5):
    for attempt in range(retries):
        try:
            return await llm.ainvoke(messages)
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                if attempt < retries - 1:
                    await asyncio.sleep(delay)
                    continue
            raise e

async def run_support_workflow():
    reset_trace_id()
    handler = AgentScoreCallbackHandler()
    trace_id = get_trace_id()
    print(f"\nExample 2: Customer Support Router (Trace: {trace_id})")
    print("Target: ~32 calls, ~$2.85")

    llm_cheap = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-lite", 
        callbacks=[handler],
        google_api_key=os.getenv("GEMINI_AGENT_KEY")
    )
    
    llm_expensive = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-demo", # Price multiplier active
        callbacks=[handler],
        google_api_key=os.getenv("GEMINI_AGENT_KEY")
    )

    tickets = [
        "My login isn't working on mobile...",
        "I requested a refund 3 days ago...",
        "How do I update my billing address?...",
        "The app crashes when I click upload...",
        "Is there a family plan available?..."
    ]

    # FLIGHT 1: Intent Classification (Redundant) (5 tickets * 2 calls = 10 calls)
    print("  Phase 1: Intent Classification (Redundant)...")
    for ticket in tickets:
        await invoke_with_retry(llm_cheap, [HumanMessage(content=f"Classify intent: {ticket}")])
        # Redundant check
        await invoke_with_retry(llm_cheap, [HumanMessage(content=f"What does the user want? {ticket}")])

    # FLIGHT 2: Sentiment Analysis (Overkill) (5 tickets * 1 call = 5 calls)
    print("  Phase 2: Sentiment Analysis (Overkill)...")
    for ticket in tickets:
        # Using expensive model for simple sentiment
        await invoke_with_retry(llm_expensive, [HumanMessage(content=f"Is this positive or negative? {ticket}")])

    # FLIGHT 3: Response Generation (Bloat) (5 tickets * 1 call = 5 calls)
    print("  Phase 3: Response Generation (Bloat)...")
    bloated_manual = "Product Manual Chapter 1... " * 300
    for ticket in tickets:
        msg = f"Context: {bloated_manual}\n\nDraft response for: {ticket}"
        await invoke_with_retry(llm_cheap, [HumanMessage(content=msg)])
        
    # FLIGHT 4: Routing (Standard) (12 more calls to reach ~32)
    print("  Phase 4: Routing Logic...")
    for i in range(12):
        await invoke_with_retry(llm_cheap, [HumanMessage(content=f"Route ticket {i} to appropriate department")])

    print("  ✓ Workflow 2 Complete")

if __name__ == "__main__":
    asyncio.run(run_support_workflow())
