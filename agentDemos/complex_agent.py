import os
import asyncio
import sys
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI

# Add SDK to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../sdk")))

from kaizen import KaizenCallbackHandler, reset_trace_id, get_trace_id

# Load environment variables from sdk/kaizen/.env
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../sdk/kaizen/.env"))
load_dotenv(dotenv_path=env_path)

async def main():
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-lite",
        temperature=0.7,
        google_api_key=os.getenv("GEMINI_AGENT_KEY")
    )
    
    reset_trace_id()
    handler = KaizenCallbackHandler()
    trace_id = get_trace_id()
    print(f"\nSession Trace ID: {trace_id}")
    print("=" * 60)
    print("  COMPLEX MULTI-LAYER AGENT DEMO")
    print("=" * 60)
    
    # Layer 1: Two parallel research tasks
    print("\n[Layer 1] Task A: Researching the history of the Slinky.")
    res1a = await llm.ainvoke([HumanMessage(content="Give me a brief 2-sentence history of the Slinky toy.")], config={"callbacks": [handler]})
    history = res1a.content
    
    print("[Layer 1] Task B: Researching Slinky physics.")
    res1b = await llm.ainvoke([HumanMessage(content="Explain in 2 sentences the physics of how a Slinky 'walks' down stairs.")], config={"callbacks": [handler]})
    physics = res1b.content
    
    # Layer 2: Merge the research
    print("\n[Layer 2] Merging Research A and B into a cohesive fact sheet.")
    prompt2 = f"Combine these two facts into a single paragraph for a children's science book:\n1. History: {history}\n2. Physics: {physics}"
    res2 = await llm.ainvoke([HumanMessage(content=prompt2)], config={"callbacks": [handler]})
    fact_sheet = res2.content
    
    # Layer 3: Use the merged result for a marketing slogan
    print("\n[Layer 3] Generating a marketing slogan based on the merged fact sheet.")
    prompt3 = f"Based on this fact sheet: '{fact_sheet}', write a catchy 5-word marketing slogan for Slinky."
    await llm.ainvoke([HumanMessage(content=prompt3)], config={"callbacks": [handler]})
    
    # Side Branch (Dead Branch): Unrelated trivia
    print("\n[Side Branch] Checking unrelated trivia (Dead Branch).")
    await llm.ainvoke([HumanMessage(content="What is the world's largest rubber duck?")], config={"callbacks": [handler]})
    
    print("\n" + "=" * 60)
    print("  DEMO FINISHED")
    print("=" * 60)
    print(f"Trace ID: {trace_id}")
    print("=" * 60)

if __name__ == "__main__":
    if not os.getenv("GEMINI_AGENT_KEY"):
        print("ERROR: GEMINI_AGENT_KEY not found in environment.")
        exit(1)
    asyncio.run(main())
