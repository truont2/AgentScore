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
AS-1 Workflow 5: Realistic Travel Agent
Goal: Mimic a real-world agent with accidental/subtle inefficiencies.
Target: ~15-20 calls
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

async def run_realistic_workflow():
    reset_trace_id()
    handler = AgentScoreCallbackHandler()
    trace_id = get_trace_id()
    print(f"\nExample 5: Realistic Travel Agent (Trace: {trace_id})")

    # Main Model (Standard)
    llm_standard = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-lite", 
        callbacks=[handler],
        google_api_key=os.getenv("GEMINI_AGENT_KEY")
    )
    
    # "Premium" Model (Used occasionally)
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

    user_request = "I need a 2-week trip to Japan (Tokyo, Kyoto, Osaka) in April. Budget $5000."

    try:
        # Step 1: High Level Itinerary (Good)
        print("  Step 1: High Level Planning...")
        await invoke_with_retry(llm_standard, [HumanMessage(content=f"Draft a 14-day itinerary split between Tokyo, Kyoto, Osaka for: {user_request}")], fallback_llm=llm_fallback)

        cities = ["Tokyo", "Kyoto", "Osaka"]
        
        # Step 2: Details per City (Iterative, slightly inefficient)
        for city in cities:
            print(f"  Step 2: Planning {city} segment...")
            
            # Hotel Search
            await invoke_with_retry(llm_standard, [HumanMessage(content=f"Find 3 hotels in {city} under $200/night")], fallback_llm=llm_fallback)
            
            # Subtly Redundant: Checking weather for every single city separately instead of one global check
            await invoke_with_retry(llm_standard, [HumanMessage(content=f"What is the typical weather in {city} in April?")], fallback_llm=llm_fallback)
            
            # Activity Search (Bloat: passing full itinerary context so far)
            context_frame = f"Current Plan: {city} segment." * 50 # Mild context bloat
            await invoke_with_retry(llm_standard, [HumanMessage(content=f"Context: {context_frame}\nSuggest 5 customized activities for {city}")], fallback_llm=llm_fallback)
            
            # Restaurant Reservation Check (Overkill for simple query)
            await invoke_with_retry(llm_premium, [HumanMessage(content=f"Do I need reservations for top ramen spots in {city}?")], fallback_llm=llm_fallback)

        # Step 3: Inter-city Travel
        print("  Step 3: Logistics...")
        await invoke_with_retry(llm_standard, [HumanMessage(content="Explain the JR Rail Pass eligibility")], fallback_llm=llm_fallback)
        await invoke_with_retry(llm_standard, [HumanMessage(content="Compare Shinkansen vs Flying for Tokyo->Osaka")], fallback_llm=llm_fallback)

        # Step 4: Final Compilation (Subtle Overkill)
        print("  Step 4: Final Polish...")
        # Using "Premium" model to format text
        await invoke_with_retry(llm_premium, [HumanMessage(content="Format this entire trip into a markdown table.")], fallback_llm=llm_fallback)
        await invoke_with_retry(llm_premium, [HumanMessage(content="Write a 'Bon Voyage' email to the client.")], fallback_llm=llm_fallback)

        print("  ✓ Realistic Workflow Complete")

    except Exception as e:
        print(f"\n  ! Run Interrupted: {e}")
        print("  ! Saving partial execution data...")

    # Auto-Export Snapshot
    print(f"\n  Generating local snapshot...")
    base_path = Path(__file__).resolve().parent.parent / "snapshots" / "realistic_travel.json"
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
    asyncio.run(run_realistic_workflow())
