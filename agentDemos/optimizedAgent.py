import os
import asyncio
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from kaizen import KaizenCallbackHandler, reset_trace_id, get_trace_id

# Load environment variables
load_dotenv(dotenv_path="../sdk/kaizen/.env")

"""
OPTIMIZED Agent: Medical Report Summarizer

Same task as the vulnerable agent, but with all three waste types fixed.
Run this after the vulnerable agent to show before/after comparison.
"""

# =============================================================================
# FIX 1: CACHE for redundant calls
# Instead of asking the same question 3 times, we ask once and reuse.
# =============================================================================
MI_DEFINITION_CACHE = {}

async def get_mi_definition(llm) -> str:
    """Get MI definition - cached to avoid redundant calls."""
    if "mi_definition" not in MI_DEFINITION_CACHE:
        print("Agent Action: Fetching MI definition (FIRST AND ONLY TIME).")
        messages = [HumanMessage(content="What is myocardial infarction (MI)? Provide a concise medical definition.")]
        result = await llm.ainvoke(messages)
        MI_DEFINITION_CACHE["mi_definition"] = result.content
    else:
        print("Agent Action: Using CACHED MI definition (no API call).")
    return MI_DEFINITION_CACHE["mi_definition"]


async def run_optimized_redundancy(handler: KaizenCallbackHandler):
    """
    FIX 1: Redundant Calls → Single cached call
    
    Before: 3 separate LLM calls asking the same thing
    After:  1 LLM call, result cached and reused
    """
    print("\n--- [Optimized] Fix 1 - Caching Redundant Calls ---")
    
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-lite",
        callbacks=[handler],
        temperature=0.7,
        google_api_key=os.getenv("GEMINI_AGENT_KEY")
    )

    # All three "requests" now use the same cached result
    definition = await get_mi_definition(llm)
    print(f"  ✓ Got definition: {definition[:80]}...")
    
    # Simulating the other two places in code that needed this info
    # They just read from cache - NO additional API calls
    _ = await get_mi_definition(llm)  # Would have been "What does MI stand for?"
    _ = await get_mi_definition(llm)  # Would have been "Define heart attack"
    
    print("  ✓ Reused cached definition 2 more times (0 additional API calls)")


async def run_optimized_model_selection(handler: KaizenCallbackHandler):
    """
    FIX 2: Model Overkill → Use appropriate model for task complexity
    
    Before: gemini-2.5-flash ($$$) for simple translation
    After:  gemini-2.5-flash-lite ($) - same quality for this task
    """
    print("\n--- [Optimized] Fix 2 - Right-Sized Model Selection ---")
    
    # Use the CHEAP model for simple translation
    appropriate_model = "gemini-2.5-flash-lite"
    
    print(f"Agent Action: Using '{appropriate_model}' for simple translation (appropriate).")
    
    llm = ChatGoogleGenerativeAI(
        model=appropriate_model,
        callbacks=[handler],
        temperature=0.7,
        google_api_key=os.getenv("GEMINI_AGENT_KEY")
    )

    messages = [HumanMessage(content="Translate 'Hello, how are you?' to Spanish.")]
    result = await llm.ainvoke(messages)
    print(f"  ✓ Translation result: {result.content}")
    print(f"  ✓ Same quality output, fraction of the cost!")


async def run_optimized_prompt(handler: KaizenCallbackHandler):
    """
    FIX 3: Prompt Bloat → Send only relevant context
    
    Before: ~32,000 chars of irrelevant conversation history
    After:  ~100 chars - just the question
    """
    print("\n--- [Optimized] Fix 3 - Lean Prompts ---")
    
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-lite",
        callbacks=[handler],
        temperature=0.7,
        google_api_key=os.getenv("GEMINI_AGENT_KEY")
    )

    # OPTIMIZED: Just ask the question directly
    # No irrelevant conversation history about weather, restaurants, parking
    prompt_content = "What is the normal resting heart rate for an adult?"
    
    print(f"Agent Action: Sending lean prompt ({len(prompt_content)} chars) for simple medical fact.")
    messages = [HumanMessage(content=prompt_content)]
    
    result = await llm.ainvoke(messages)
    print(f"  ✓ Got answer: {result.content[:100]}...")
    print(f"  ✓ Same answer, ~99% fewer input tokens!")


async def main():
    print("=" * 60)
    print("  OPTIMIZED AGENT: Medical Report Summarizer")
    print("  All Three Waste Types FIXED")
    print("=" * 60)
    print("\nOptimizations applied:")
    print("  ✓ Redundancy: Cache MI definition, call once instead of 3x")
    print("  ✓ Model Overkill: Use flash-lite for simple translation")
    print("  ✓ Prompt Bloat: Remove irrelevant context, send lean prompts")
    print("\nExpected results:")
    print("  - 3 total LLM calls (down from 5)")
    print("  - All using gemini-2.5-flash-lite (cheapest)")
    print("  - Minimal token usage per call")
    print("  - Efficiency score: 90+ (up from ~47)")
    
    # Clear cache for fresh run
    MI_DEFINITION_CACHE.clear()
    
    reset_trace_id()
    handler = KaizenCallbackHandler()
    trace_id = get_trace_id()
    print(f"\nSession Trace ID: {trace_id}")
    print("-" * 60)
    
    await run_optimized_redundancy(handler)
    await run_optimized_model_selection(handler)
    await run_optimized_prompt(handler)
    
    print("\n" + "=" * 60)
    print("  OPTIMIZED DEMO FINISHED")
    print("=" * 60)
    print(f"Trace ID: {trace_id}")
    print("\nCompare this workflow against the vulnerable agent in the dashboard!")
    print("=" * 60)


if __name__ == "__main__":
    if not os.getenv("GEMINI_AGENT_KEY"):
        print("ERROR: GEMINI_AGENT_KEY not found in environment.")
        exit(1)
    asyncio.run(main())