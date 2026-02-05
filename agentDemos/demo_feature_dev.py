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

# Add backend to path
sys.path.append(str(Path(__file__).resolve().parent.parent / "backend"))
from export_snapshot import export_snapshot

# Load env
env_path = Path(__file__).resolve().parent.parent / "sdk" / "agentscore" / ".env"
load_dotenv(dotenv_path=env_path)

"""
AS-1 Workflow 6: Feature Implementation Agent
Goal: Implement a new 'Search' endpoint in a backend API.
Target: ~20-25 calls
Inefficiencies:
- Redundancy: Fragmented security checks (one per vector).
- Bloat: Dumping entire file history/context for small changes.
- Overkill: Using premium reasoning models for simple git messages.
"""

async def invoke_with_retry(llm, messages, retries=5, delay=65, fallback_llm=None):
    for attempt in range(retries):
        try:
            return await llm.ainvoke(messages)
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                if fallback_llm:
                    print(f"  ! Rate limit hit. Switching to Fallback...")
                    try:
                        return await fallback_llm.ainvoke(messages)
                    except Exception as fallback_e:
                        print(f"  X Fallback failed: {fallback_e}")
                        raise fallback_e
                
                print(f"  Rate limit hit. Retrying in {delay}s...")
                if attempt < retries - 1:
                    await asyncio.sleep(delay)
                    continue
            raise e

async def run_feature_dev_workflow():
    reset_trace_id()
    handler = AgentScoreCallbackHandler()
    trace_id = get_trace_id()
    print(f"\nExample 6: Feature Implementation Agent (Trace: {trace_id})")

    # Standard (Cheap) - e.g. for reading code
    llm_standard = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-lite", 
        callbacks=[handler],
        google_api_key=os.getenv("GEMINI_AGENT_KEY")
    )
    
    # Premium (Expensive) - e.g. for "architecting"
    llm_premium = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash", 
        callbacks=[handler],
        google_api_key=os.getenv("GEMINI_AGENT_KEY")
    )

    # Fallback
    llm_fallback = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash", 
        callbacks=[handler],
        google_api_key=os.getenv("GEMINI_AGENT_KEY")
    )

    feature_request = "Add a GET /search endpoint that filters users by name and role."
    
    # Detailed Context (Bloat Source)
    # Simulating a context window stuffed with irrelevant "Legacy Code" and "Node Modules"
    existing_code = """
    # LEGACY CODE BLOCK V1.0 (DEPRECATED)
    def old_search():
        pass
        
    # HUGE MOCK DEPENDENCY LIST
    import pandas as pd
    import numpy as np
    import requests
    # ... (Imagine 200 more lines of imports) ...
    """ * 50

    try:
        # Step 1: Exploration (Realistic)
        print("  Step 1: Exploring Codebase...")
        await invoke_with_retry(llm_standard, [HumanMessage(content=f"List all files in repository structure related to: {feature_request}")], fallback_llm=llm_fallback)
        await invoke_with_retry(llm_standard, [HumanMessage(content=f"Read contents of app/main.py")], fallback_llm=llm_fallback)
        await invoke_with_retry(llm_standard, [HumanMessage(content=f"Read contents of app/models.py")], fallback_llm=llm_fallback)

        # Step 2: Architecture Plan (Good use of Premium)
        print("  Step 2: Planning Implementation...")
        await invoke_with_retry(llm_premium, [HumanMessage(content=f"Design the Pydantic models and SQLAlchemy schema for: {feature_request}")], fallback_llm=llm_fallback)

        # Step 3: Implementation (Bloat: Context Stuffing)
        print("  Step 3: Writing Code (with Context Bloat)...")
        
        # Writing DB Model
        msg = f"Current models.py:\n{existing_code}\n\nAdd a 'User' model with search capability."
        await invoke_with_retry(llm_standard, [HumanMessage(content=msg)], fallback_llm=llm_fallback)

        # Writing API Endpoint
        msg = f"Current main.py:\n{existing_code}\n\nUsing FastAPI, implement the GET /search endpoint."
        await invoke_with_retry(llm_standard, [HumanMessage(content=msg)], fallback_llm=llm_fallback)

        # Step 4: Security Review (Redundancy)
        print("  Step 4: Fragmented Security Audit...")
        # Inefficient: Checking each component separately instead of having a comprehensive security pass
        await invoke_with_retry(llm_standard, [HumanMessage(content="Check Project for SQL Injection vulnerabilities in the new route")], fallback_llm=llm_fallback)
        await invoke_with_retry(llm_standard, [HumanMessage(content="Check Project for Rate Limiting configuration")], fallback_llm=llm_fallback)
        await invoke_with_retry(llm_standard, [HumanMessage(content="Check Project for Authentication bypass risks")], fallback_llm=llm_fallback)
        await invoke_with_retry(llm_standard, [HumanMessage(content="Check Project for Proper CORS headers")], fallback_llm=llm_fallback)

        # Step 5: Testing (Slight Overkill)
        print("  Step 5: Test Generation...")
        await invoke_with_retry(llm_premium, [HumanMessage(content="Write comprehensive pytest unit tests for the new endpoint.")], fallback_llm=llm_fallback)
        
        # Redundant: Verify tests again?
        await invoke_with_retry(llm_standard, [HumanMessage(content="Verify that these tests cover 100% of edge cases.")], fallback_llm=llm_fallback)

        # Step 6: Documentation (Overkill)
        print("  Step 6: Git Operations...")
        # Overkill: using premium model for git commit
        await invoke_with_retry(llm_premium, [HumanMessage(content="Generate a conventional commit message for these changes.")], fallback_llm=llm_fallback)
        # Overkill: using premium model for PR description
        await invoke_with_retry(llm_premium, [HumanMessage(content="Generate a Pull Request description with summary of changes.")], fallback_llm=llm_fallback)

        print("  ✓ Feature Implementation Complete")

    except Exception as e:
        print(f"\n  ! Run Interrupted: {e}")
        print("  ! Saving partial execution data...")

    # Auto-Export Snapshot
    print(f"\n  Generating local snapshot...")
    base_path = Path(__file__).resolve().parent.parent / "snapshots" / "feature_dev.json"
    output_path = base_path
    
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
    asyncio.run(run_feature_dev_workflow())
