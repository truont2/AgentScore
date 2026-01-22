import os
import asyncio
import sys
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI

# Add SDK to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../sdk")))

from kaizen import KaizenCallbackHandler, reset_trace_id, get_trace_id

# Load environment variables
load_dotenv(dotenv_path="../sdk/kaizen/.env")

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
    print("-" * 60)
    
    # Call 1: Generate a fun fact
    print("Action 1: Generating a fun fact about space.")
    res1 = await llm.ainvoke([HumanMessage(content="Tell me a unique fun fact about Saturn's rings.")], config={"callbacks": [handler]})
    fact = res1.content
    print(f"Fact: {fact[:100]}...")
    
    # Call 2: Summarize the fact (Information Flow)
    # We explicitly include the output of Call 1 in the prompt for Call 2
    print("\nAction 2: Summarizing the fact (Information Flow Detected).")
    prompt2 = f"Based on this fact: '{fact}', write a catchy one-sentence headline for a science newsletter."
    await llm.ainvoke([HumanMessage(content=prompt2)], config={"callbacks": [handler]})
    
    # Call 3: Unrelated call (Dead Branch)
    print("\nAction 3: Unrelated call (Dead Branch - not used in future calls).")
    await llm.ainvoke([HumanMessage(content="What is the capital of France?")], config={"callbacks": [handler]})
    
    print("\n" + "=" * 60)
    print("  DEMO FINISHED")
    print("=" * 60)
    print(f"Trace ID: {trace_id}")
    print("-" * 60)

if __name__ == "__main__":
    if not os.getenv("GEMINI_AGENT_KEY"):
        print("ERROR: GEMINI_AGENT_KEY not found in environment.")
        exit(1)
    asyncio.run(main())
