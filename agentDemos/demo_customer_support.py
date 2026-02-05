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

async def invoke_with_retry(llm, messages, retries=5, delay=65, fallback_llm=None):
    for attempt in range(retries):
        try:
            return await llm.ainvoke(messages)
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                if fallback_llm:
                    print(f"  ! Rate limit hit. Switching to Fallback Model (gemini-1.5-flash)...")
                    try:
                        return await fallback_llm.ainvoke(messages)
                    except Exception as fallback_e:
                        print(f"  X Fallback also failed: {fallback_e}")
                        raise fallback_e
                
                print(f"  Rate limit hit. Retrying in {delay}s... (Attempt {attempt+1}/{retries})")
                if attempt < retries - 1:
                    await asyncio.sleep(delay)
                    continue
            raise e

# Add backend to path for export_snapshot
sys.path.append(str(Path(__file__).resolve().parent.parent / "backend"))
from export_snapshot import export_snapshot

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
        model="gemini-2.5-flash", # Price multiplier active
        callbacks=[handler],
        google_api_key=os.getenv("GEMINI_AGENT_KEY")
    )

    # Robust Fallback Model
    llm_fallback = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash", 
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

    try:
        # FLIGHT 1: Intent Classification (Redundant) (5 tickets * 2 calls = 10 calls)
        print("  Phase 1: Intent Classification (Redundant)...")
        for ticket in tickets:
            await invoke_with_retry(llm_cheap, [HumanMessage(content=f"Classify intent: {ticket}")], fallback_llm=llm_fallback)
            # Redundant check
            await invoke_with_retry(llm_cheap, [HumanMessage(content=f"What does the user want? {ticket}")], fallback_llm=llm_fallback)

        # FLIGHT 2: Sentiment Analysis (Overkill) (5 tickets * 1 call = 5 calls)
        print("  Phase 2: Sentiment Analysis (Overkill)...")
        for ticket in tickets:
            # Using expensive model for simple sentiment
            await invoke_with_retry(llm_expensive, [HumanMessage(content=f"Is this positive or negative? {ticket}")], fallback_llm=llm_fallback)

        # FLIGHT 3: Response Generation (Bloat) (5 tickets * 1 call = 5 calls)
        print("  Phase 3: Response Generation (Bloat)...")
        # Realistic "Bloat" - Creating a massive, irrelevant context dump that looks like RAG gone wrong
        bloated_manual = """
        SECTION 14.3.2: TICKET ROUTING PROTOCOLS
        If the user is from Region A, route to Queue B unless it is a leap year.
        Exception: VIP users (Tier 4) bypass routing.
        
        SECTION 14.3.3: UPLOAD LIMITS
        - JPG: 5MB
        - PNG: 5MB
        - GIF: 2MB (Animated)
        - PDF: 10MB
        - DOCX: 8MB
        
        SECTION 14.3.4: COMPLIANCE
        ISO 27001 requires that all tickets be tagged with a severity level...
        """ * 100

        for ticket in tickets:
            msg = f"Reference Manual:\n{bloated_manual}\n\nDraft response for: {ticket}"
            await invoke_with_retry(llm_cheap, [HumanMessage(content=msg)], fallback_llm=llm_fallback)
            
        # FLIGHT 4: Routing (Standard) (12 more calls to reach ~32)
        print("  Phase 4: Routing Logic...")
        for i in range(12):
            await invoke_with_retry(llm_cheap, [HumanMessage(content=f"Route ticket {i} to appropriate department")], fallback_llm=llm_fallback)

        print("  ✓ Workflow 2 Complete")
    except Exception as e:
        print(f"\n  ! Run Interrupted: {e}")
        print("  ! Saving partial execution data...")

    # Auto-Export Snapshot
    print(f"\n  Generating local snapshot...")
    base_path = Path(__file__).resolve().parent.parent / "snapshots" / "customer_support.json"
    output_path = base_path
    
    # Auto-increment filename if exists
    counter = 1
    while output_path.exists():
        output_path = base_path.parent / f"{base_path.stem}{counter}{base_path.suffix}"
        counter += 1
        
    output_path.parent.mkdir(exist_ok=True)
    
    try:
        export_snapshot(trace_id=trace_id, output_file=str(output_path))
        print(f"  ✓ Snapshot saved to {output_path}")
    except Exception as e:
        print(f"  X Failed to save snapshot: {e}")

if __name__ == "__main__":
    asyncio.run(run_support_workflow())
