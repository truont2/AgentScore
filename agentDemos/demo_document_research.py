import os
import asyncio
import sys
from pathlib import Path
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI

# Add sdk to path to allow importing agentscore without installation
sys.path.append(str(Path(__file__).resolve().parent.parent / "sdk"))
from agentscore import AgentScoreCallbackHandler, reset_trace_id, get_trace_id

# Explicitly load .env from sdk/agentscore
env_path = Path(__file__).resolve().parent.parent / "sdk" / "agentscore" / ".env"
load_dotenv(dotenv_path=env_path)

"""
AS-1 Workflow 1: Document Research Agent
Goal: ~47 calls, ~$3.40
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

async def run_document_research_workflow():
    reset_trace_id()
    handler = AgentScoreCallbackHandler()
    trace_id = get_trace_id()
    print(f"\nExample 4: Document Research & Synthesis (Trace: {trace_id})")
    print("Target: ~47 calls, ~$5.80 (High Complexity)")

    # Standard cheap model for volume
    llm_cheap = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-lite", 
        callbacks=[handler],
        google_api_key=os.getenv("GEMINI_AGENT_KEY")
    )

    llm_expensive = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        callbacks=[handler],
        google_api_key=os.getenv("GEMINI_AGENT_KEY")
    )

    # Robust Fallback Model
    llm_fallback = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash", 
        callbacks=[handler],
        google_api_key=os.getenv("GEMINI_AGENT_KEY")
    )

    documents = [
        "Doc A: Market analysis of semiconductor industry 2025...",
        "Doc B: Supply chain logistics for rare earth metals...",
        "Doc C: Geopolitical impact on trade tariffs...",
        "Doc D: Labor statistics in manufacturing sector...",
        "Doc E: Environmental regulations for mining..."
    ]

    try:
        # FLIGHT 1: Metadata Extraction (Redundant) (5 docs * 3 calls = 15 calls)
        print("  Phase 1: Metadata Extraction (Redundant)...")
        for doc in documents:
            await invoke_with_retry(llm_cheap, [HumanMessage(content=f"Extract date from: {doc}")], fallback_llm=llm_fallback)
            await invoke_with_retry(llm_cheap, [HumanMessage(content=f"Find the publication year in: {doc}")], fallback_llm=llm_fallback)
            await invoke_with_retry(llm_cheap, [HumanMessage(content=f"When was this published? {doc}")], fallback_llm=llm_fallback)

        # FLIGHT 2: Summarization (Overkill) (5 docs * 1 call = 5 calls)
        print("  Phase 2: Summarization (Overkill)...")
        for doc in documents:
            await invoke_with_retry(llm_expensive, [HumanMessage(content=f"Summarize this in one sentence: {doc}")], fallback_llm=llm_fallback)

        # FLIGHT 3: Key Entity Extraction (Bloat) (5 docs * 1 call = 5 calls)
        print("  Phase 3: Entity Extraction (Bloat)...")
        # Realistic "Bloat" - Simulating a bad scraper that grabbed the entire footer/nav
        long_context = """
        [Home] [About] [Contact] [Privacy Policy] [Terms of Service]
        Copyright 2024. All rights reserved. Consolidate Inc.
        Address: 123 Main St, New York, NY 10001
        Phone: +1 555-0199
        Social: @consolidate_ai
        
        Sitemap:
        - Products > Hardware > 2024 Lineup
        - Products > Software > SaaS Platform
        - Company > Team > Leadership
        """ * 100
        
        for doc in documents:
            msg = f"Page Navigation & Footer:\n{long_context}\n\nExtract key entities from: {doc}"
            await invoke_with_retry(llm_cheap, [HumanMessage(content=msg)], fallback_llm=llm_fallback)

        # FLIGHT 4: Cross-Reference (Mixed) (22 more calls to reach ~47)
        print("  Phase 4: Cross-Referencing...")
        for i in range(22):
            await invoke_with_retry(llm_cheap, [HumanMessage(content=f"Check connection between Doc A and Doc {i}")], fallback_llm=llm_fallback)

        print("  ✓ Workflow 1 Complete")
    except Exception as e:
        print(f"\n  ! Run Interrupted: {e}")
        print("  ! Saving partial execution data...")

    # Auto-Export Snapshot
    print(f"\n  Generating local snapshot...")
    base_path = Path(__file__).resolve().parent.parent / "snapshots" / "document_research.json"
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
    asyncio.run(run_document_research_workflow())
