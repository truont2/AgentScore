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

async def run_document_research_workflow():
    reset_trace_id()
    handler = AgentScoreCallbackHandler()
    trace_id = get_trace_id()
    print(f"\nExample 1: Document Research Agent (Trace: {trace_id})")
    print("Target: ~47 calls, ~$3.40")

    # Standard cheap model for volume
    llm_cheap = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-lite", 
        callbacks=[handler],
        google_api_key=os.getenv("GEMINI_AGENT_KEY")
    )

    # Expensive model for overkill (using -demo to trigger multiplier)
    llm_expensive = ChatGoogleGenerativeAI(
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

    # FLIGHT 1: Metadata Extraction (Redundant) (5 docs * 3 calls = 15 calls)
    print("  Phase 1: Metadata Extraction (Redundant)...")
    for doc in documents:
        await invoke_with_retry(llm_cheap, [HumanMessage(content=f"Extract date from: {doc}")])
        await invoke_with_retry(llm_cheap, [HumanMessage(content=f"Find the publication year in: {doc}")]) 
        await invoke_with_retry(llm_cheap, [HumanMessage(content=f"When was this published? {doc}")])

    # FLIGHT 2: Summarization (Overkill) (5 docs * 1 call = 5 calls)
    print("  Phase 2: Summarization (Overkill)...")
    for doc in documents:
        await invoke_with_retry(llm_expensive, [HumanMessage(content=f"Summarize this in one sentence: {doc}")])

    # FLIGHT 3: Key Entity Extraction (Bloat) (5 docs * 1 call = 5 calls)
    print("  Phase 3: Entity Extraction (Bloat)...")
    long_context = "Ignorable Context " * 500 
    for doc in documents:
        msg = f"{long_context}\n\nExtract key entities from: {doc}"
        await invoke_with_retry(llm_cheap, [HumanMessage(content=msg)])
        
    # FLIGHT 4: Cross-Reference (Mixed) (22 more calls to reach ~47)
    print("  Phase 4: Cross-Referencing...")
    for i in range(22):
        await invoke_with_retry(llm_cheap, [HumanMessage(content=f"Check connection between Doc A and Doc {i}")])

    print("  ✓ Workflow 1 Complete")


if __name__ == "__main__":
    asyncio.run(run_document_research_workflow())
