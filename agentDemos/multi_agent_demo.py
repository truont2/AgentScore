import os
import asyncio
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from kaizen import KaizenCallbackHandler, reset_trace_id, get_trace_id

# Load environment variables
load_dotenv(dotenv_path="sdk/kaizen/.env")

async def run_researcher(topic: str, callback: KaizenCallbackHandler):
    """
    Agent 1: The Researcher. Finds facts.
    """
    print(f"\n--- [Researcher] Starting work on: {topic} ---")
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        callbacks=[callback],
        temperature=0.0,
        google_api_key=os.getenv("GEMINI_API_KEY")
    )
    msg = f"Give me 3 brief, interesting facts about {topic}."
    response = await llm.ainvoke([HumanMessage(content=msg)])
    print(f"--- [Researcher] Output: ---\n{response.content}\n")
    return response.content

async def run_writer(facts: str, callback: KaizenCallbackHandler):
    """
    Agent 2: The Writer. Writes a poem based on facts.
    """
    print(f"\n--- [Writer] Starting work based on facts ---")
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        callbacks=[callback],
        temperature=0.7,
        google_api_key=os.getenv("GEMINI_API_KEY")
    )
    msg = f"Write a short haiku using these facts:\n{facts}"
    response = await llm.ainvoke([HumanMessage(content=msg)])
    print(f"--- [Writer] Output: ---\n{response.content}\n")
    return response.content

async def main():
    print("=== Multi-Agent Workflow Demo ===")
    
    # 1. Start a clean workflow session
    reset_trace_id()
    current_trace = get_trace_id()
    print(f"Session Trace ID: {current_trace}")
    
    # 2. Shared Callback Handler
    # Note: Even if we used different handler instances, the Trace ID 
    # would still be shared because it lives in the contextvars (the "Backpack").
    handler = KaizenCallbackHandler()
    
    # 3. Step 1: Research
    facts = await run_researcher("Dolphins", handler)
    
    # 4. Step 2: Write
    # We are still in the same async context, so the Trace ID should persist.
    await run_writer(facts, handler)
    
    print("=== Demo Finished ===")
    print(f"Final verify: Trace ID was {get_trace_id()}")

if __name__ == "__main__":
    if not os.getenv("GEMINI_API_KEY"):
        print("ERROR: GEMINI_API_KEY not found. Check .env file.")
        exit(1)
        
    asyncio.run(main())
