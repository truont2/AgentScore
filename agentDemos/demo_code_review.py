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

    # Robust Fallback Model
    llm_fallback = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash", 
        callbacks=[handler],
        google_api_key=os.getenv("GEMINI_AGENT_KEY")
    )

    functions = [
        "def auth_user(token): ...",
        "def query_db(sql): ...",
        "def render_template(ctx): ...",
        "def api_handler(req): ..."
    ]

    try:
        # FLIGHT 1: Syntax Check (Redundant) (4 funcs * 2 calls = 8 calls)
        print("  Phase 1: Syntax Checks (Redundant)...")
        for func in functions:
            await invoke_with_retry(llm_cheap, [HumanMessage(content=f"Check syntax: {func}")], fallback_llm=llm_fallback)
            await invoke_with_retry(llm_cheap, [HumanMessage(content=f"Are there syntax errors in: {func}")], fallback_llm=llm_fallback)

        # FLIGHT 2: Logic Audit (Overkill) (4 funcs * 2 calls = 8 calls)
        # Using expensive model heavily here to drive up cost to $4.12
        print("  Phase 2: Logic Audit (Overkill)...")
        for func in functions:
            await invoke_with_retry(llm_expensive, [HumanMessage(content=f"Audit this code for logic bugs: {func}")], fallback_llm=llm_fallback)
            await invoke_with_retry(llm_expensive, [HumanMessage(content=f"Suggest performance improvements: {func}")], fallback_llm=llm_fallback)

        # FLIGHT 3: Style Check (Bloat) (4 funcs * 1 call = 4 calls)
        print("  Phase 3: Style Check (Bloat)...")
        # Realistic looking "Bloat" - A massive dump of irrelevant configuration/license text
        bloat_text = """
        /* LICENSE START */
        Permission is hereby granted, free of charge, to any person obtaining a copy...
        /* END LICENSE */
        
        Config:
        { "version": "1.0", "debug": false, "host": "0.0.0.0", "retry": 5, "timeout": 300 }
        
        Deprecations:
        [ "v1.0", "v1.1", "v1.2", "v1.3", "v1.4", "v1.5", "v1.6" ]
        """ * 200 # Still massive, but looks like "Context Dumping"
        
        repo_context = f"Repository Global Config:\n{bloat_text}\n\nLegacy Modules:\n{bloat_text}"

        for func in functions:
            msg = f"Context:\n{repo_context}\n\nCheck style for: {func}"
            await invoke_with_retry(llm_cheap, [HumanMessage(content=msg)], fallback_llm=llm_fallback)
            
        # FLIGHT 4: Final Summary (8 calls to reach ~28)
        print("  Phase 4: Summary Generation...")
        for i in range(8):
            await invoke_with_retry(llm_cheap, [HumanMessage(content=f"Summarize review findings for item {i}")], fallback_llm=llm_fallback)

        print("  ✓ Workflow 3 Complete")
    except Exception as e:
        print(f"\n  ! Run Interrupted: {e}")
        print("  ! Saving partial execution data...")
    
    # Auto-Export Snapshot
    print(f"\n  Generating local snapshot...")
    base_path = Path(__file__).resolve().parent.parent / "snapshots" / "code_review.json"
    output_path = base_path
    
    # Auto-increment filename if exists
    counter = 1
    while output_path.exists():
        output_path = base_path.parent / f"{base_path.stem}{counter}{base_path.suffix}"
        counter += 1
    
    output_path.parent.mkdir(exist_ok=True)
    
    # export_snapshot is sync, wrapping or calling directly
    try:
        export_snapshot(trace_id=trace_id, output_file=str(output_path))
        print(f"  ✓ Snapshot saved to {output_path}")
    except Exception as e:
        print(f"  X Failed to save snapshot: {e}")

if __name__ == "__main__":
    asyncio.run(run_code_review_workflow())
