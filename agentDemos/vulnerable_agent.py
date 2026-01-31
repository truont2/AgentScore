import os
import asyncio
import time
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
Simulated Agent: Medical Report Summarizer

This agent takes a patient case and produces a summary.
It demonstrates all three waste types in a realistic workflow.
"""

async def invoke_with_retry(llm, messages, retries=3, delay=30):
    for attempt in range(retries):
        try:
            return await llm.ainvoke(messages)
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                if attempt < retries - 1:
                    print(f"  ⚠ Rate limit hit (429). Waiting {delay}s before retry {attempt+1}/{retries}...")
                    await asyncio.sleep(delay)
                    continue
            raise e

async def run_redundant_calls(handler: AgentScoreCallbackHandler):
    """
    Type 1: Redundant Calls
    Same question asked multiple times in different words.
    """
    print("\n--- [Agent] Flaw: Type 1 - Redundant Calls ---")
    
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-lite",
        callbacks=[handler],
        temperature=0.7,
        google_api_key=os.getenv("GEMINI_AGENT_KEY")
    )

    print("Agent Action 1: Asking for definition of Myocardial Infarction.")
    messages1 = [HumanMessage(content="What is the medical definition of Myocardial Infarction?")]
    await invoke_with_retry(llm, messages1)
    
    print("Agent Action 2: Asking about MI (semantically identical).")
    messages2 = [HumanMessage(content="In medical terminology, what does MI stand for and what is it?")]
    await invoke_with_retry(llm, messages2)

    print("Agent Action 3: Yet another MI question (triple redundancy).")
    messages3 = [HumanMessage(content="Define heart attack - also known as myocardial infarction.")]
    await invoke_with_retry(llm, messages3)


async def run_model_overkill(handler: AgentScoreCallbackHandler):
    """
    Type 2: Model Overkill
    Using expensive Flash model for a simple task when Flash-Lite would suffice.
    """
    print("\n--- [Agent] Flaw: Type 2 - Model Overkill ---")
    
    expensive_model = "gemini-2.5-flash"
    
    print(f"Agent Action: Using '{expensive_model}' for simple translation (overkill).")
    
    llm = ChatGoogleGenerativeAI(
        model=expensive_model,
        callbacks=[handler],
        temperature=0.7,
        google_api_key=os.getenv("GEMINI_AGENT_KEY")
    )

    messages = [HumanMessage(content="Translate 'Hello, how are you?' to Spanish.")]
    await invoke_with_retry(llm, messages)


async def run_prompt_bloat(handler: AgentScoreCallbackHandler):
    """
    Type 3: Prompt Bloat
    Sending excessive irrelevant context for a simple task.
    """
    print("\n--- [Agent] Flaw: Type 3 - Prompt Bloat ---")
    
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-lite",
        callbacks=[handler],
        temperature=0.7,
        google_api_key=os.getenv("GEMINI_AGENT_KEY")
    )

    print("Agent Action: Constructing bloated conversation history.")
    
    conversation_history = """
User: Hey, I was wondering about the weather yesterday.
Assistant: Yesterday was sunny with temperatures around 72°F in the downtown area. The humidity was relatively low at 45%, making it quite pleasant for outdoor activities.
User: That's nice. What about the day before?
Assistant: Two days ago was partly cloudy with a high of 68°F. There was a brief shower in the afternoon that lasted about 20 minutes.
User: I see. My friend asked about the weekend forecast.
Assistant: The weekend looks pleasant with temperatures in the low 70s. Saturday should be mostly sunny, while Sunday might see some afternoon clouds.
User: Do you know any good restaurants nearby?
Assistant: There are several great options! For Italian, try Bella Vista on Main Street. For sushi, Sakura House has excellent reviews. If you want something casual, The Corner Bistro has great burgers.
User: What about parking in that area?
Assistant: Parking can be tricky on weekends. There's a public garage on 5th Street that charges $2/hour, or you can find street parking which is free after 6pm.
""" * 30
    
    prompt_content = f"""
Here is the full conversation history for context:

{conversation_history}

---
Based on all the above context, please answer this simple medical question:
What is the normal resting heart rate for an adult?
"""
    
    print(f"Agent Action: Sending bloated prompt (~{len(prompt_content)} chars) for simple medical fact.")
    messages = [HumanMessage(content=prompt_content)]
    
    try:
        result = await invoke_with_retry(llm, messages)
        print(f"  ✓ Bloat call SUCCESS - response: {len(result.content)} chars")
    except Exception as e:
        print(f"  ✗ Bloat call FAILED: {type(e).__name__}: {e}")


async def main():
    print("=" * 60)
    print("  VULNERABLE AGENT DEMO: Medical Report Summarizer")
    print("  Demonstrating the Three Types of AI Waste")
    print("=" * 60)
    print("\nModels used:")
    print("  - gemini-2.5-flash-lite (cheap - standard calls)")
    print("  - gemini-2.5-flash (expensive - overkill demo)")
    print("\nExpected issues to detect:")
    print("  - 3 redundant calls (same MI question)")
    print("  - 1 model overkill (flash for simple translation)")
    print("  - 1 prompt bloat (~5000 tokens for simple question)")
    
    reset_trace_id()
    handler = AgentScoreCallbackHandler()
    trace_id = get_trace_id()
    print(f"\nSession Trace ID: {trace_id}")
    print("-" * 60)
    
    await run_redundant_calls(handler)
    await run_model_overkill(handler)
    await run_prompt_bloat(handler)
    
    print("\n" + "=" * 60)
    print("  DEMO FINISHED")
    print("=" * 60)
    print(f"Trace ID: {trace_id}")
    print("Use this ID to analyze the workflow in the AgentScore dashboard.")
    print("=" * 60)


if __name__ == "__main__":
    if not os.getenv("GEMINI_AGENT_KEY"):
        print("ERROR: GEMINI_AGENT_KEY not found in environment.")
        exit(1)
    asyncio.run(main())