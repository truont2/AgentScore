import os
import asyncio
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from kaizen import KaizenCallbackHandler, get_trace_id

# Load environment variables (expecting GEMINI_API_KEY)
load_dotenv(dotenv_path="sdk/kaizen/.env")

async def main():
    print("--- Starting Demo Agent ---")
    
    # 1. Initialize the callback handler
    kaizen_callback = KaizenCallbackHandler()
    
    # 2. Initialize the LLM (Gemini) with our callback
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        callbacks=[kaizen_callback],
        temperature=0.7,
        google_api_key=os.getenv("GEMINI_API_KEY")
    )
    
    print(f"Current Trace ID: {get_trace_id()}")
    
    # 3. simple generation
    query = "Explain the importance of contextvars in async python in 1 sentence."
    print(f"\nUser Query: {query}\n")
    
    # invoke the agent
    response = await llm.ainvoke([HumanMessage(content=query)])
    
    print(f"\nAgent Response: {response.content}")
    print("\n--- Demo Finished ---")

if __name__ == "__main__":
    if not os.getenv("GEMINI_API_KEY"):
        print("ERROR: GEMINI_API_KEY not found in environment.")
        exit(1)
        
    asyncio.run(main())
