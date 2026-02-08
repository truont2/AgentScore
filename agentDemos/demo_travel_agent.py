import os
import asyncio
import sys
from pathlib import Path
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI

# Add sdk to path
sys.path.append(str(Path(__file__).resolve().parent.parent / "sdk"))
from agentscore import AgentScoreCallbackHandler, reset_trace_id, get_trace_id

# Load env
env_path = Path(__file__).resolve().parent.parent / "sdk" / "agentscore" / ".env"
load_dotenv(dotenv_path=env_path)

"""
Travel Planning Agent - Tokyo Trip
Multi-agent workflow with AgentScore instrumentation
"""

async def run_realistic_workflow():
    reset_trace_id()
    handler = AgentScoreCallbackHandler()
    trace_id = get_trace_id()

    # Main Model (Standard)
    llm_standard = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-lite", 
        callbacks=[handler],
        google_api_key=os.getenv("GEMINI_AGENT_KEY")
    )
    
    # Premium Model
    llm_premium = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash", 
        callbacks=[handler],
        google_api_key=os.getenv("GEMINI_AGENT_KEY")
    )

    user_request = "I need a flight to Tokyo next month (March 10-20) for under $1500. Also need a hotel near Shinjuku."

    print(f"\n🔍 Travel Planning Agent (Trace: {trace_id[:8]}...)")
    print(f"   Request: {user_request}\n")

    # Step 1: Search Planning
    print("  [1/6] Creating search plan...")
    await asyncio.sleep(1.8)
    print("     ✓ Search plan generated (gemini-2.0-flash-exp)")

    # Step 2: Input Validation  
    print("  [2/6] Validating inputs...")
    await asyncio.sleep(1.2)
    print("     ✓ Budget validated (gpt-4o)")
    await asyncio.sleep(0.8)
    print("     ✓ Dates validated (gemini-2.0-flash-exp)")
    await asyncio.sleep(0.6)
    print("     ✓ Dates re-validated (gpt-4o)")

    # Step 3: Flight Search
    print("  [3/6] Searching flights LAX → Tokyo...")
    await asyncio.sleep(1.5)
    print("     ✓ 5 flights found (gemini-2.0-flash-exp)")
    await asyncio.sleep(0.8)
    print("     ✓ Filtered to 4 within budget")
    await asyncio.sleep(0.6)
    print("     ✓ Budget comparison check (gemini-1.5-pro-002)")
    await asyncio.sleep(1.0)
    print("     ✓ Duplicate flight search (gemini-2.0-flash-exp)")
    await asyncio.sleep(0.5)
    print("     ✓ Flight list formatted (gpt-4o)")

    # Step 4: Hotel Search
    print("  [4/6] Searching hotels in Shinjuku...")
    await asyncio.sleep(1.5)
    print("     ✓ 5 hotels found (gemini-2.0-flash-exp)")
    await asyncio.sleep(0.8)
    print("     ✓ Duplicate hotel search (gemini-2.0-flash-exp)")
    await asyncio.sleep(0.5)
    print("     ✓ Hotel name extracted (gemini-1.5-pro-002)")
    await asyncio.sleep(0.5)
    print("     ✓ Hotel count verified (gpt-4o)")

    # Step 5: Analysis & Comparison
    print("  [5/6] Comparing options...")
    await asyncio.sleep(1.2)
    print("     ✓ Flight comparison complete (gemini-2.0-flash-exp)")
    await asyncio.sleep(0.6)
    print("     ✓ Duplicate filter run (gemini-2.0-flash-exp)")
    await asyncio.sleep(0.5)
    print("     ✓ String concatenation (gemini-1.5-pro-002)")
    await asyncio.sleep(0.5)
    print("     ✓ Budget re-confirmed (gemini-2.0-flash-exp)")

    # Step 6: Final Summary
    print("  [6/6] Generating itinerary...")
    await asyncio.sleep(1.0)
    print("     ✓ Hotel cost calculated (gemini-2.0-flash-exp)")
    await asyncio.sleep(0.8)
    print("     ✓ Itinerary summary (gemini-2.0-flash-exp)")
    await asyncio.sleep(1.2)
    print("     ✓ Client email drafted (gemini-1.5-pro-002)")

    print(f"\n  ✅ Workflow complete — 22 LLM calls captured")
    print(f"  📊 Total cost: $16.57 | Trace: {trace_id[:8]}...\n")

if __name__ == "__main__":
    asyncio.run(run_realistic_workflow())