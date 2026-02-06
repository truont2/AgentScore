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
AS-1 Workflow 5: Recruiting Assistant (Talent Scout)
Goal: Screen candidates, extract data, and draft outreach.
Target: ~25-30 calls
Inefficiencies:
- Redundancy: Extracting contact info in separate calls.
- Bloat: Passing full resume text for simple queries.
- Overkill: Using premium model for rejection emails.
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

async def run_recruiting_workflow():
    reset_trace_id()
    handler = AgentScoreCallbackHandler()
    trace_id = get_trace_id()
    print(f"\nExample 5: Recruiting Assistant (Trace: {trace_id})")

    # Standard (Cheap)
    llm_standard = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-lite", 
        callbacks=[handler],
        google_api_key=os.getenv("GEMINI_AGENT_KEY")
    )
    
    # Premium (Expensive)
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

    candidates = ["Alex Chen (Full Stack)", "Sam Smith (DevOps)", "Jordan Lee (Product)", "Taylor Doe (Design)", "Casey Wu (Data)"]
    job_desc = "Seeking a Senior Full Stack Engineer with 5+ years of Python/React experience."

    try:
        # Step 1: Initial Batch Screening (Good)
        print("  Step 1: Batch Screening...")
        await invoke_with_retry(llm_standard, [HumanMessage(content=f"Rank these candidates for the role: {candidates}")], fallback_llm=llm_fallback)

        # Step 2: Deep Dive per Candidate
        for candidate in candidates:
            print(f"  Step 2: Processing {candidate}...")
            
            # Realistic Inefficiency: Redundant Extraction (Multiple calls instead of one)
            # A common mistake in agent loops is to have a specialized tool for each field
            await invoke_with_retry(llm_standard, [HumanMessage(content=f"Extract phone number for: {candidate}")], fallback_llm=llm_fallback)
            await invoke_with_retry(llm_standard, [HumanMessage(content=f"Extract email address for: {candidate}")], fallback_llm=llm_fallback)
            await invoke_with_retry(llm_standard, [HumanMessage(content=f"Extract years of experience for: {candidate}")], fallback_llm=llm_fallback)

            # Realistic Inefficiency: Context Bloat
            # Passing a "Full Resume" blob (simulated) 3 times for simple questions
            resume_blob = f"RESUME CONTENT FOR {candidate}\n" + "History: worked at X...\nSkills: Y, Z...\n" * 50
            
            msg1 = f"Resume:\n{resume_blob}\n\nDoes this candidate know Python?"
            await invoke_with_retry(llm_standard, [HumanMessage(content=msg1)], fallback_llm=llm_fallback)
            
            msg2 = f"Resume:\n{resume_blob}\n\nDoes this candidate know React?"
            await invoke_with_retry(llm_standard, [HumanMessage(content=msg2)], fallback_llm=llm_fallback)

            # Realistic Inefficiency: Model Overkill
            # Using the expensive model to write a generic email
            print(f"    Drafting email to {candidate}...")
            await invoke_with_retry(llm_premium, [HumanMessage(content=f"Draft a polite 'Thank you for applying' email to {candidate}.")], fallback_llm=llm_fallback)

        print("  ✓ Recruiting Workflow Complete")

    except Exception as e:
        print(f"\n  ! Run Interrupted: {e}")
        print("  ! Saving partial execution data...")

    # Auto-Export Snapshot
    print(f"\n  Generating local snapshot...")
    base_path = Path(__file__).resolve().parent.parent / "snapshots" / "recruiting_agent.json"
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
    asyncio.run(run_recruiting_workflow())
